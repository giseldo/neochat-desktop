const Groq = require('groq-sdk');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { pruneMessageHistory, sanitizeMessageHistory, extractThinking } = require('./messageUtils');
const { supportsBuiltInTools } = require('../shared/models');
const { getActiveApiKey, getProviderBaseUrl, getProviderCandidates, getDefaultModel } = require('../shared/providers');
const googleOAuthManager = require('./googleOAuthManager');
const { getWebSearchToolDefinition } = require('./webSearchService');
const { getRagToolDefinitions } = require('./ragService');
const { getActiveCanvasDocument } = require('./canvasManager');

// Track active streams to allow cancellation
const activeStreams = new Map();

// Track streams by sender webContents ID to prevent duplicates during HMR
const streamsBySender = new Map();

/**
 * Helper to clean up a stream from both tracking maps
 * @param {string} streamId - The stream ID to clean up
 */
function cleanupStream(streamId) {
    const streamInfo = activeStreams.get(streamId);
    if (streamInfo) {
        // Clear any intervals
        if (streamInfo.summaryInterval) {
            clearInterval(streamInfo.summaryInterval);
            streamInfo.summaryInterval = null;
        }
    }
    activeStreams.delete(streamId);
    
    // Also clean up from streamsBySender
    for (const [senderId, sid] of streamsBySender.entries()) {
        if (sid === streamId) {
            streamsBySender.delete(senderId);
            break;
        }
    }
}

function validateApiKey(settings) {
    const apiKey = getActiveApiKey(settings);
    if (!apiKey || apiKey === "<replace me>") {
        throw new Error(`API key not configured. Please add your API key for the "${settings.provider || 'groq'}" provider in settings.`);
    }
}

function determineModel(model, settings, modelContextSizes) {
    const rawInput = model || settings?.model || "llama-3.3-70b-versatile";
    
    // 1. Direct match in modelContextSizes
    let modelInfo = modelContextSizes ? modelContextSizes[rawInput] : null;

    // 2. If not found directly, look up with heuristics for prefix / suffix / rawModelId
    if (!modelInfo && modelContextSizes && typeof rawInput === 'string') {
        if (rawInput.includes('::')) {
            const [pId, rawId] = rawInput.split('::');
            // Try matching rawId directly
            modelInfo = modelContextSizes[rawId];
            if (!modelInfo) {
                const found = Object.values(modelContextSizes).find(cfg =>
                    cfg && (cfg.rawModelId === rawId || cfg.id === rawId) && (!cfg.provider || cfg.provider === pId)
                );
                if (found) modelInfo = found;
            }
        } else {
            // Raw string like "openai/gpt-oss-120b"
            // Prefer current settings provider if it matches
            const preferredProvider = settings?.provider || 'groq';
            const found = Object.values(modelContextSizes).find(cfg =>
                cfg && (cfg.rawModelId === rawInput || cfg.id === rawInput) && cfg.provider === preferredProvider
            ) || Object.values(modelContextSizes).find(cfg =>
                cfg && (cfg.rawModelId === rawInput || cfg.id === rawInput)
            );
            if (found) modelInfo = found;
        }
    }

    modelInfo = modelInfo || (modelContextSizes ? modelContextSizes['default'] : null) || { context: 8192, vision_supported: false };

    // The actual raw model name for the provider API request
    const modelToUse = modelInfo?.rawModelId || modelInfo?.id || (typeof rawInput === 'string' && rawInput.includes('::') ? rawInput.split('::')[1] : rawInput);
    const modelProvider = modelInfo?.provider || (typeof rawInput === 'string' && rawInput.includes('::') ? rawInput.split('::')[0] : settings?.provider) || 'groq';

    return { modelToUse, modelInfo, selectedModelKey: rawInput, modelProvider };
}

function checkVisionSupport(messages, modelInfo, modelToUse, event) {
    const hasImages = messages.some(msg =>
        msg.role === 'user' &&
        Array.isArray(msg.content) &&
        msg.content.some(part => part.type === 'image_url')
    );

    if (hasImages && !modelInfo.vision_supported) {
        console.warn(`Attempting to use images with non-vision model: ${modelToUse}`);
        event.sender.send('chat-stream-error', { error: `The selected model (${modelToUse}) does not support image inputs. Please select a vision-capable model.` });
        return false; // Return false to indicate vision check failed
    }
    
    return true; // Return true to indicate vision check passed
}

function prepareTools(discoveredTools, isResponsesApi = false, settings = {}) {
    // Prepare tools for the API call
    const tools = (discoveredTools || []).map(tool => {
        if (!tool.name) {
            console.warn('[ChatHandler] Warning: Tool missing name:', tool);
        }

        // Sanitize schema: Reconstruction Strategy
        // Build a standard JSON schema for OpenAI / Groq tool calling without enforcing strict mode
        let safeSchema = {
            type: "object",
            properties: {}
        };

        const schema = tool.input_schema || tool.inputSchema;
        if (schema && typeof schema === 'object') {
             try {
                 // Rebuild properties, preserving property definitions
                 if (schema.properties && typeof schema.properties === 'object' && schema.properties !== null) {
                     for (const [key, value] of Object.entries(schema.properties)) {
                         if (value && typeof value === 'object') {
                             safeSchema.properties[key] = { ...value };
                         }
                     }
                 }

                 // Rebuild required only if it has items
                 if (Array.isArray(schema.required) && schema.required.length > 0) {
                     safeSchema.required = [...schema.required];
                 }

             } catch (e) {
                 console.error('[ChatHandler] Error sanitizing tool schema:', e);
                 safeSchema = { type: "object", properties: {} };
             }
        }

        if (isResponsesApi) {
            // Groq Responses API (beta) expects a flat structure
            return {
                type: "function",
                name: tool.name || "unknown_tool",
                description: tool.description || "",
                parameters: safeSchema
            };
        } else {
            // Standard Chat Completions API expects nested function object
            return {
                type: "function",
                function: {
                    name: tool.name || "unknown_tool",
                    description: tool.description || "",
                    parameters: safeSchema
                }
            };
        }
    });

    // Add native web_search tool if enabled
    const webSearchEnabled = settings.webSearch?.enabled !== false;
    const hasWebSearchAlready = tools.some(t => (t.name === 'web_search' || t.function?.name === 'web_search'));

    if (webSearchEnabled && !hasWebSearchAlready) {
        if (isResponsesApi) {
            tools.push({
                type: "function",
                name: "web_search",
                description: "Search the live web for real-time information, news, current events, facts, weather, technical docs, and latest data. Returns search results with titles, URLs, and descriptive snippets.",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to look up on the web. Be specific and include key terms."
                        }
                    },
                    required: ["query"]
                }
            });
        } else {
            tools.push(getWebSearchToolDefinition());
        }
    }

    // Add native RAG / Knowledge base tools
    const ragTools = getRagToolDefinitions();
    for (const rt of ragTools) {
        const hasAlready = tools.some(t => t.name === rt.function.name || t.function?.name === rt.function.name);
        if (!hasAlready) {
            if (isResponsesApi) {
                tools.push({
                    type: "function",
                    name: rt.function.name,
                    description: rt.function.description,
                    parameters: rt.function.parameters
                });
            } else {
                tools.push(rt);
            }
        }
    }

    // Add native Canvas tools
    const canvasTools = getCanvasTools(isResponsesApi);
    for (const ct of canvasTools) {
        const toolName = isResponsesApi ? ct.name : ct.function?.name;
        const hasAlready = tools.some(t => t.name === toolName || t.function?.name === toolName);
        if (!hasAlready) {
            tools.push(ct);
        }
    }

    return tools;
}

function getCanvasTools(isResponsesApi = false) {
    const rawTools = [
        {
            name: "canvas_create_document",
            description: "Create a new document in the interactive Canvas workspace. Use this when the user asks to draft, write, or generate a document, article, guide, essay, script, component, notes, report, or long-form content.",
            parameters: {
                type: "object",
                properties: {
                    title: {
                        type: "string",
                        description: "Clear, concise title for the document (e.g. 'Guia Completo de TypeScript', 'Proposta Comercial')."
                    },
                    content: {
                        type: "string",
                        description: "The full initial text, markdown, or code content for the document."
                    },
                    language: {
                        type: "string",
                        description: "The language or format of the document: 'markdown', 'javascript', 'python', 'html', 'react', 'css', 'json', 'sql', or 'text'."
                    },
                    summary: {
                        type: "string",
                        description: "Brief summary of what was created (e.g. 'Documento inicial com estrutura e introdução')."
                    }
                },
                required: ["title", "content"]
            }
        },
        {
            name: "canvas_update_document",
            description: "Update, rewrite, expand, or alter the entire active Canvas document. Use this when making broad changes, rewrites, adding entire sections, fixing overall style/tone, or translating the document.",
            parameters: {
                type: "object",
                properties: {
                    content: {
                        type: "string",
                        description: "The complete updated content of the document."
                    },
                    summary: {
                        type: "string",
                        description: "Brief explanation of the changes made (e.g. 'Adicionados 3 novos exemplos práticos e conclusão')."
                    },
                    title: {
                        type: "string",
                        description: "Optional updated title if the title changed."
                    },
                    language: {
                        type: "string",
                        description: "Optional updated language/format if changed."
                    }
                },
                required: ["content", "summary"]
            }
        },
        {
            name: "canvas_edit_selection",
            description: "Perform a targeted edit/replacement of a specific snippet or section within the active Canvas document. Use this for specific edits, fixing typos, updating a single paragraph, or replacing a function.",
            parameters: {
                type: "object",
                properties: {
                    targetText: {
                        type: "string",
                        description: "The exact text snippet currently in the document that should be replaced."
                    },
                    replacementText: {
                        type: "string",
                        description: "The new replacement text that should take its place."
                    },
                    summary: {
                        type: "string",
                        description: "Brief description of the edit made."
                    }
                },
                required: ["targetText", "replacementText", "summary"]
            }
        },
        {
            name: "canvas_get_document",
            description: "Retrieve the current content, version, and stats of the active Canvas document.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    ];

    return rawTools.map(t => {
        if (isResponsesApi) {
            return {
                type: "function",
                name: t.name,
                description: t.description,
                parameters: t.parameters
            };
        }
        return {
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        };
    });
}

function cleanMessages(messages) {
    return sanitizeMessageHistory(messages);
}

function buildApiParams(prunedMessages, modelToUse, settings, tools, modelContextSizes) {
    // Get current date/time with timezone
    const now = new Date();
    const dateTimeString = now.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZoneName: 'long',
        hour12: false
    });
    
    let systemPrompt = `You are a helpful assistant capable of using tools. Use tools only when necessary and relevant to the user's request. Format responses using Markdown.\n\nCurrent date and time: ${dateTimeString}`;
    
    if (settings.webSearch?.enabled !== false) {
        systemPrompt += `\n\n- Web Search: You have access to the 'web_search' tool. When answering questions that require current information, recent facts, live news, documentation, or when the user asks to search the web, execute 'web_search'. Always cite consulted sources in your response using markdown links [Source Title](URL) or citation markers [1], [2].`;
    }

    systemPrompt += `\n\n- Project Knowledge Base (Local RAG): You have access to 'query_project_knowledge' and 'read_project_file'. When answering questions about local project files, code, architecture, or documentation, use 'query_project_knowledge' to search relevant snippets and 'read_project_file' to view detailed file content. Always cite relevant file paths and line ranges (e.g. \`path/file.ext:L10-L40\`) in your response.`;

    // Canvas Workspace System Instructions
    systemPrompt += `\n\n- CANVAS WORKSPACE (Interactive Document Editor):
You have access to interactive Canvas tools: 'canvas_create_document', 'canvas_update_document', 'canvas_edit_selection', and 'canvas_get_document'.
When the user asks you to create, draft, write, edit, rewrite, improve, format, code, or alter a document or code file in the Canvas, ALWAYS invoke the appropriate Canvas tool to update the document directly.
- Use 'canvas_create_document' when starting a new document or when no document is active.
- Use 'canvas_update_document' when making extensive revisions, rewriting, restructuring, translating, or updating the full document.
- Use 'canvas_edit_selection' when making targeted corrections, rewriting a specific paragraph, or replacing a specific section/snippet.`;

    // Inject active Canvas document context if present
    const activeCanvas = settings.activeCanvasDoc || getActiveCanvasDocument(settings.currentChatId || 'default');
    if (activeCanvas && activeCanvas.content) {
        systemPrompt += `\n\n=== ACTIVE CANVAS DOCUMENT ===\nDocument ID: ${activeCanvas.id}\nTitle: ${activeCanvas.title}\nLanguage: ${activeCanvas.language || 'markdown'}\nVersion: ${activeCanvas.version || 1}\nWords: ${activeCanvas.stats?.words || 0}\n`;
        if (settings.selectedCanvasText) {
            systemPrompt += `User Selected Text in Canvas:\n"""\n${settings.selectedCanvasText}\n"""\n`;
        }
        systemPrompt += `Current Content:\n\`\`\`${activeCanvas.language || ''}\n${activeCanvas.content}\n\`\`\`\n==============================\n`;
    }

    if (settings.isAgentMode || settings.agentMode) {
        systemPrompt += `\n\n- AUTONOMOUS AGENT MODE: You are currently executing in Autonomous Multi-Step Agent Mode. Break down complex requests into logical sequential steps. Proactively invoke the necessary tools (web search, project knowledge, code execution, MCP tools) one after another to research, implement, and verify the user's objective without stopping prematurely. Once all steps are completed, provide a concise, high-quality final summary of your actions and findings.`;
    }

    if (settings.customSystemPrompt && settings.customSystemPrompt.trim()) {
        systemPrompt += `\n\n${settings.customSystemPrompt.trim()}`;
    }

    // Prepare built-in tools if enabled and supported by the model
    const builtInTools = [];
    if (supportsBuiltInTools(modelToUse, modelContextSizes) && settings.builtInTools) {
        if (settings.builtInTools.codeInterpreter) {
            builtInTools.push({ type: "code_interpreter" });
        }
        if (settings.builtInTools.browserSearch) {
            builtInTools.push({ type: "browser_search" });
        }
    }

    // Combine MCP tools and built-in tools
    const allTools = [...tools];
    if (builtInTools.length > 0) {
        // For built-in tools, we add them directly (not as functions)
        allTools.push(...builtInTools);
    }

    // Check if the model contains "compound" in its name
    const isCompoundModel = modelToUse.toLowerCase().includes('compound');
    
    // Don't pass tools to compound models
    const shouldIncludeTools = allTools.length > 0 && !isCompoundModel;
    
    if (isCompoundModel && allTools.length > 0) {
        // Tools skipped for compound models
    }

    // Extract any incoming system messages and non-system messages
    const customSystemMessages = prunedMessages.filter(m => m.role === 'system');
    const nonSystemMessages = prunedMessages.filter(m => m.role !== 'system');

    if (customSystemMessages.length > 0) {
        const customPromptText = customSystemMessages
            .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
            .join('\n\n');
        systemPrompt += `\n\n${customPromptText}`;
    }

    const apiParams = {
        messages: [{ role: "system", content: systemPrompt }, ...nonSystemMessages],
        model: modelToUse,
        temperature: settings.temperature ?? 0.7,
        top_p: settings.top_p ?? 0.95,
        ...(shouldIncludeTools && { tools: allTools, tool_choice: "auto" }),
        stream: true,
        stream_options: { include_usage: true }
    };

    // Add reasoning_effort parameter for gpt-oss models
    if (modelToUse.includes('gpt-oss') && settings.reasoning_effort) {
        apiParams.reasoning_effort = settings.reasoning_effort;
    }

    return apiParams;
}

// Processes individual stream chunks for compound-beta and regular models
function processStreamChunk(chunk, event, accumulatedData, groq, streamId, settings) {
    // Capture usage data if present (standard chunk.usage or Groq chunk.x_groq.usage)
    const rawUsage = chunk.usage || chunk.x_groq?.usage;
    if (rawUsage) {
        const promptTokens = rawUsage.prompt_tokens ?? rawUsage.input_tokens ?? accumulatedData.usage?.prompt_tokens ?? 0;
        const completionTokens = rawUsage.completion_tokens ?? rawUsage.output_tokens ?? accumulatedData.usage?.completion_tokens ?? 0;
        const totalTokens = rawUsage.total_tokens ?? (promptTokens + completionTokens);

        accumulatedData.usage = {
            ...(accumulatedData.usage || {}),
            ...rawUsage,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            prompt_time: rawUsage.prompt_time || accumulatedData.usage?.prompt_time,
            completion_time: rawUsage.completion_time || accumulatedData.usage?.completion_time,
            total_time: rawUsage.total_time || accumulatedData.usage?.total_time,
            queue_time: rawUsage.queue_time || accumulatedData.usage?.queue_time,
        };
    }

    if (!chunk.choices?.[0]) return null;

    const { delta } = chunk.choices[0];

    if (accumulatedData.isFirstChunk) {
        accumulatedData.ttft = Date.now() - (accumulatedData.startTime || Date.now());
        accumulatedData.streamId = chunk.id;
        event.sender.send('chat-stream-start', {
            id: accumulatedData.streamId,
            role: delta?.role || "assistant",
            ttft: accumulatedData.ttft
        });
        accumulatedData.isFirstChunk = false;
    }

    if (delta?.content) {
        accumulatedData.content += delta.content;
        event.sender.send('chat-stream-content', { content: delta.content });
        
        // If this is the first content token after reasoning, clear the summary interval
        if (accumulatedData.content === delta.content && accumulatedData.summaryInterval && accumulatedData.reasoning.length > 0) {
            clearInterval(accumulatedData.summaryInterval);
            accumulatedData.summaryInterval = null;
            const streamInfo = activeStreams.get(streamId);
            if (streamInfo) {
                streamInfo.summaryInterval = null;
            }
        }
    }

    // Reasoning streaming - supports both delta.reasoning and delta.reasoning_content
    // (different models use different field names)
    const reasoningDelta = delta?.reasoning || delta?.reasoning_content;
    if (reasoningDelta) {
        accumulatedData.reasoning += reasoningDelta;
        
        // Send reasoning to frontend so it knows reasoning is happening
        event.sender.send('chat-stream-reasoning', {
            reasoning: reasoningDelta,
            accumulated: accumulatedData.reasoning
        });
        
        // Start interval timer on first reasoning chunk
        if (!accumulatedData.summaryInterval) {
            // Check if thinking summaries are disabled
            if (!settings?.disableThinkingSummaries) {
                accumulatedData.lastSummarizedTime = Date.now();
                
                // Set up interval to check every 2 seconds
                accumulatedData.summaryInterval = setInterval(() => {
                // Check if stream is still active before triggering summarization
                const currentStreamInfo = activeStreams.get(streamId);
                if (!currentStreamInfo || currentStreamInfo.cancelled) {
                    if (accumulatedData.summaryInterval) {
                        clearInterval(accumulatedData.summaryInterval);
                        accumulatedData.summaryInterval = null;
                    }
                    return;
                }
                
                const now = Date.now();
                const timeSinceLastSummary = now - accumulatedData.lastSummarizedTime;
                
                if (timeSinceLastSummary >= 2000 && accumulatedData.reasoning.length > 0) {
                    accumulatedData.lastSummarizedTime = now;
                    accumulatedData.summaryCount++;
                    
                    // Get the last 300 words for summarization
                    const last300Words = getLastNWords(accumulatedData.reasoning, 300);
                    
                    // Trigger summarization asynchronously (non-blocking)
                    summarizeReasoningChunk(groq, last300Words, event, streamId, accumulatedData.summaryCount, accumulatedData.model)
                        .catch(err => console.error('[Backend] Error in background summarization:', err));
                }
            }, 2000);
            
            // Store interval reference in activeStreams so stopChatStream can clear it
            const streamInfo = activeStreams.get(streamId);
            if (streamInfo) {
                streamInfo.summaryInterval = accumulatedData.summaryInterval;
            }
            }
        }
    }

    // Compound-beta executed tools streaming - handles progressive tool execution
    if (delta?.executed_tools?.length > 0) {
        for (const executedTool of delta.executed_tools) {
            let existingTool = accumulatedData.executedTools.find(t => t.index === executedTool.index);

            if (!existingTool) {
                // First delta: tool starts executing
                const newTool = {
                    index: executedTool.index,
                    type: executedTool.type,
                    arguments: executedTool.arguments || "",
                    output: executedTool.output || null,
                    name: executedTool.name || "",
                    search_results: executedTool.search_results || null
                };
                accumulatedData.executedTools.push(newTool);

                event.sender.send('chat-stream-tool-execution', {
                    type: 'start',
                    tool: {
                        index: executedTool.index,
                        type: executedTool.type,
                        arguments: executedTool.arguments,
                        name: executedTool.name
                    }
                });
            } else {
                // Second delta: tool execution completes with output
                // Only update output and search_results, NOT arguments or name (they should already be set from start)
                
                // Log a warning if arguments or name are being sent in completion delta (they shouldn't be)
                if (executedTool.arguments && executedTool.arguments !== existingTool.arguments) {
                    console.warn(`[WARNING] Tool completion delta contains different arguments! Index: ${executedTool.index}`);
                    console.warn(`  Existing arguments: ${existingTool.arguments}`);
                    console.warn(`  Delta arguments (ignored): ${executedTool.arguments}`);
                }
                if (executedTool.name && executedTool.name !== existingTool.name) {
                    console.warn(`[WARNING] Tool completion delta contains different name! Index: ${executedTool.index}`);
                    console.warn(`  Existing name: ${existingTool.name}`);
                    console.warn(`  Delta name (ignored): ${executedTool.name}`);
                }
                
                // Only update output and search_results
                if (executedTool.search_results) existingTool.search_results = executedTool.search_results;
                if (executedTool.output !== undefined) {
                    existingTool.output = executedTool.output;
                    
                    // Send complete event with fully updated tool data
                    event.sender.send('chat-stream-tool-execution', {
                        type: 'complete',
                        tool: existingTool
                    });
                }
            }
        }
    }

    // Regular MCP tool calls - accumulate incrementally streamed tool calls
    if (delta?.tool_calls?.length > 0) {
        for (const toolCallDelta of delta.tool_calls) {
            let existingCall = accumulatedData.toolCalls.find(tc => tc.index === toolCallDelta.index);

            if (!existingCall) {
                accumulatedData.toolCalls.push({
                    index: toolCallDelta.index,
                    id: toolCallDelta.id || `tool_${Date.now()}_${toolCallDelta.index}`,
                    type: toolCallDelta.type || 'function',
                    function: {
                        name: toolCallDelta.function?.name || "",
                        arguments: toolCallDelta.function?.arguments || ""
                    }
                });
            } else {
                if (toolCallDelta.function?.arguments) {
                    existingCall.function.arguments += toolCallDelta.function.arguments;
                }
                if (toolCallDelta.function?.name) {
                    existingCall.function.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.id) {
                    existingCall.id = toolCallDelta.id;
                }
            }
        }
        event.sender.send('chat-stream-tool-calls', { tool_calls: accumulatedData.toolCalls });
    }

    return chunk.choices[0].finish_reason;
}

function handleStreamCompletion(event, accumulatedData, finishReason, streamId, chatCompletionParams) {
    // Clear the summary interval if it exists
    if (accumulatedData.summaryInterval) {
        clearInterval(accumulatedData.summaryInterval);
        accumulatedData.summaryInterval = null;
        const streamInfo = activeStreams.get(streamId);
        if (streamInfo) {
            streamInfo.summaryInterval = null;
        }
    }

    const elapsedSeconds = Math.max(0.001, (Date.now() - (accumulatedData.startTime || Date.now())) / 1000);

    // Calculate prompt estimation if not provided by the API
    let estimatedPromptTokens = 0;
    if (chatCompletionParams?.messages) {
        let totalPromptChars = 0;
        for (const msg of chatCompletionParams.messages) {
            if (typeof msg.content === 'string') {
                totalPromptChars += msg.content.length;
            } else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    if (part.type === 'text' && part.text) totalPromptChars += part.text.length;
                }
            }
        }
        if (chatCompletionParams.tools?.length > 0) {
            totalPromptChars += JSON.stringify(chatCompletionParams.tools).length;
        }
        estimatedPromptTokens = Math.max(1, Math.round(totalPromptChars / 4));
    }

    const estimatedCompletionTokens = Math.max(1, Math.round(
        ((accumulatedData.content || '').length + 
         (accumulatedData.reasoning || '').length + 
         (accumulatedData.toolCalls?.length ? JSON.stringify(accumulatedData.toolCalls).length : 0)) / 4
    ));

    if (accumulatedData.usage) {
        accumulatedData.usage.ttft = accumulatedData.ttft || 0;
        if (!accumulatedData.usage.prompt_tokens && estimatedPromptTokens > 0) {
            accumulatedData.usage.prompt_tokens = estimatedPromptTokens;
        }
        if (!accumulatedData.usage.completion_tokens && estimatedCompletionTokens > 0) {
            accumulatedData.usage.completion_tokens = estimatedCompletionTokens;
        }
        accumulatedData.usage.total_tokens = accumulatedData.usage.total_tokens || 
            ((accumulatedData.usage.prompt_tokens || 0) + (accumulatedData.usage.completion_tokens || 0));

        if (!accumulatedData.usage.total_time && accumulatedData.usage.completion_time) {
            accumulatedData.usage.total_time = accumulatedData.usage.completion_time;
        }
        accumulatedData.usage.client_duration = elapsedSeconds;
    } else {
        accumulatedData.usage = {
            prompt_tokens: estimatedPromptTokens,
            completion_tokens: estimatedCompletionTokens,
            total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
            completion_time: elapsedSeconds,
            total_time: elapsedSeconds,
            ttft: accumulatedData.ttft || 0,
            client_duration: elapsedSeconds,
            is_estimated: true
        };
    }

    // Calculate detailed breakdown of where tokens were spent
    let systemChars = 0;
    let userChars = 0;
    let historyChars = 0;
    let toolsChars = 0;
    const toolsList = (chatCompletionParams?.tools || []).map(t => t.function?.name || t.name || t.type).filter(Boolean);

    if (chatCompletionParams?.messages) {
        for (let i = 0; i < chatCompletionParams.messages.length; i++) {
            const msg = chatCompletionParams.messages[i];
            let msgChars = 0;
            if (typeof msg.content === 'string') {
                msgChars = msg.content.length;
            } else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    if (part.type === 'text' && part.text) msgChars += part.text.length;
                }
            }
            if (msg.role === 'system') {
                systemChars += msgChars;
            } else if (i === chatCompletionParams.messages.length - 1 && msg.role === 'user') {
                userChars += msgChars;
            } else {
                historyChars += msgChars;
            }
        }
    }
    if (chatCompletionParams?.tools?.length > 0) {
        toolsChars = JSON.stringify(chatCompletionParams.tools).length;
    }

    const totalInputChars = systemChars + userChars + historyChars + toolsChars;
    const actualPromptTokens = accumulatedData.usage?.prompt_tokens || estimatedPromptTokens || 1;
    const actualCompletionTokens = accumulatedData.usage?.completion_tokens || estimatedCompletionTokens || 0;

    const contentLen = (accumulatedData.content || '').length;
    const reasoningLen = (accumulatedData.reasoning || '').length;
    const totalOutputLen = contentLen + reasoningLen;

    accumulatedData.usage.breakdown = {
        tools: {
            count: toolsList.length,
            chars: toolsChars,
            tools: toolsList,
            estimated_tokens: Math.max(0, Math.round(totalInputChars > 0 ? (toolsChars / totalInputChars) * actualPromptTokens : toolsChars / 4))
        },
        system: {
            chars: systemChars,
            estimated_tokens: Math.max(0, Math.round(totalInputChars > 0 ? (systemChars / totalInputChars) * actualPromptTokens : systemChars / 4))
        },
        history: {
            chars: historyChars,
            estimated_tokens: Math.max(0, Math.round(totalInputChars > 0 ? (historyChars / totalInputChars) * actualPromptTokens : historyChars / 4))
        },
        user_input: {
            chars: userChars,
            estimated_tokens: Math.max(0, Math.round(totalInputChars > 0 ? (userChars / totalInputChars) * actualPromptTokens : userChars / 4))
        },
        completion: {
            content_tokens: totalOutputLen > 0 ? Math.round((contentLen / totalOutputLen) * actualCompletionTokens) : actualCompletionTokens,
            reasoning_tokens: totalOutputLen > 0 ? Math.round((reasoningLen / totalOutputLen) * actualCompletionTokens) : 0,
            total_tokens: actualCompletionTokens
        }
    };
    
    let finalContent = accumulatedData.content;
    let finalReasoning = accumulatedData.reasoning;
    const thinkResult = extractThinking(finalContent);
    if (thinkResult.hasThink) {
        finalContent = thinkResult.cleanContent;
        finalReasoning = [finalReasoning, thinkResult.thinking].filter(Boolean).join('\n\n---\n\n');
    }
    
    const completionData = {
        content: finalContent,
        role: "assistant",
        tool_calls: accumulatedData.toolCalls.length > 0 ? accumulatedData.toolCalls : undefined,
        reasoning: finalReasoning || undefined,
        executed_tools: accumulatedData.executedTools.length > 0 ? accumulatedData.executedTools : undefined,
        finish_reason: finishReason,
        usage: accumulatedData.usage
    };
    
    event.sender.send('chat-stream-complete', completionData);
}

// Helper function to count words in text
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Helper function to get last N words from text
function getLastNWords(text, n) {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.slice(-n).join(' ');
}

// Summarize reasoning chunk using llama-3.1-8b-instant (non-blocking)
async function summarizeReasoningChunk(groq, reasoningText, event, streamId, summaryIndex, model) {
    try {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You must respond with ONLY 3-5 plain words. No markdown, no formatting, no punctuation, no explanations. Just 3-5 words describing the activity.'
                },
                {
                    role: 'user',
                    content: `What activity is happening here in 3-5 words:\n\n${reasoningText}\n\nRespond with ONLY 3-5 plain words:`
                }
            ],
            model: model || 'llama-3.1-8b-instant',
            temperature: 0.3,
            max_tokens: 10,
            stream: false
        });
        
        // Check if stream is still active before sending results
        const streamInfo = activeStreams.get(streamId);
        if (!streamInfo || streamInfo.cancelled) {
            return;
        }
        
        const summary = response.choices[0]?.message?.content?.trim() || 'Processing thoughts';
        
        // Send the summary to the frontend with streamId and index
        event.sender.send('chat-stream-reasoning-summary', {
            streamId,
            summaryIndex,
            summary
        });
        
        return summary;
    } catch (error) {
        console.error(`[Backend Summary ${summaryIndex}] Error summarizing:`, error.message);
        
        // Check if stream is still active before sending error fallback
        const streamInfo = activeStreams.get(streamId);
        if (!streamInfo || streamInfo.cancelled) {
            return;
        }
        
        const fallbackSummary = 'Analyzing reasoning';
        event.sender.send('chat-stream-reasoning-summary', {
            streamId,
            summaryIndex,
            summary: fallbackSummary
        });
        return fallbackSummary;
    }
}

// Executes stream with retry logic for tool_use_failed errors and tool call validation errors
async function executeStreamWithRetry(groq, chatCompletionParams, event, streamId, settings) {
    const MAX_TOOL_USE_RETRIES = 25;
    let retryCount = 0;
    const baseTemperature = chatCompletionParams.temperature;

    while (retryCount <= MAX_TOOL_USE_RETRIES) {
        // Clear any existing interval from previous retry
        const streamInfo = activeStreams.get(streamId);
        if (streamInfo && streamInfo.summaryInterval) {
            clearInterval(streamInfo.summaryInterval);
            streamInfo.summaryInterval = null;
        }
        
        let accumulatedData = {
            content: "",
            toolCalls: [],
            reasoning: "",
            executedTools: [],
            isFirstChunk: true,
            streamId: null,
            reasoningSummaries: [],
            lastSummarizedTime: 0,
            summaryCount: 0,
            summaryInterval: null,
            usage: null,
            startTime: Date.now(),
            ttft: null,
            model: chatCompletionParams.model
        };
        
        try {

            // Check if stream was cancelled before starting
            if (!streamInfo || streamInfo.cancelled) {
                event.sender.send('chat-stream-cancelled', { streamId });
                cleanupStream(streamId);
                return { cancelled: true };
            }

            // Write request payload to /tmp if logging is enabled
            let requestFilePath = null;
            let responseFilePath = null;
            let responseChunks = [];
            if (settings.logApiRequests) {
                const requestTimestamp = Date.now();
                requestFilePath = path.join('/tmp', `chat-completion-request-${requestTimestamp}-${streamId}.json`);
                fs.writeFileSync(requestFilePath, JSON.stringify(chatCompletionParams, null, 2));
                console.log(`[ChatHandler] Request payload written to: ${requestFilePath}`);

                // Create response file path
                responseFilePath = path.join('/tmp', `chat-completion-response-${requestTimestamp}-${streamId}.json`);
            }

            const stream = await groq.chat.completions.create(chatCompletionParams);
            
            // Store the stream iterator for potential cancellation
            if (streamInfo) {
                streamInfo.stream = stream;
            }

            let recordedFinishReason = null;
            for await (const chunk of stream) {
                // Check if stream was cancelled during iteration
                const currentStreamInfo = activeStreams.get(streamId);
                if (!currentStreamInfo || currentStreamInfo.cancelled) {
                    // Clear summary interval if it exists
                    if (accumulatedData.summaryInterval) {
                        clearInterval(accumulatedData.summaryInterval);
                        accumulatedData.summaryInterval = null;
                        if (currentStreamInfo) {
                            currentStreamInfo.summaryInterval = null;
                        }
                    }
                    // Write accumulated response chunks before cancelling if logging is enabled
                    if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                        fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                        console.log(`[ChatHandler] Response chunks written to: ${responseFilePath}`);
                    }
                    event.sender.send('chat-stream-cancelled', { streamId });
                    cleanupStream(streamId);
                    return { cancelled: true };
                }

                // Accumulate response chunks if logging is enabled
                if (settings.logApiRequests) {
                    responseChunks.push(chunk);
                }

                const finishReason = processStreamChunk(chunk, event, accumulatedData, groq, streamId, settings);
                if (finishReason) {
                    recordedFinishReason = finishReason;
                }
            }

            // Write final response chunks if logging is enabled
            if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                console.log(`[ChatHandler] Response chunks written to: ${responseFilePath}`);
            }

            if (recordedFinishReason || accumulatedData.content || accumulatedData.toolCalls.length > 0 || accumulatedData.reasoning) {
                handleStreamCompletion(event, accumulatedData, recordedFinishReason || "stop", streamId, chatCompletionParams);
                cleanupStream(streamId);
                return { success: true };
            }

            // Clear summary interval before exiting
            if (accumulatedData.summaryInterval) {
                clearInterval(accumulatedData.summaryInterval);
                accumulatedData.summaryInterval = null;
                const streamInfo = activeStreams.get(streamId);
                if (streamInfo) {
                    streamInfo.summaryInterval = null;
                }
            }
            
            // Write accumulated response chunks before error if logging is enabled
            if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                console.log(`[ChatHandler] Response chunks written to: ${responseFilePath}`);
            }
            
            if (settings.deferProviderErrors && !accumulatedData.content && !accumulatedData.reasoning && accumulatedData.toolCalls.length === 0) {
                return { success: false, error: 'Stream ended unexpectedly' };
            }
            cleanupStream(streamId);
            event.sender.send('chat-stream-error', { error: "Stream ended unexpectedly." });
            return;

        } catch (error) {
            // Check if this was a cancellation
            const streamInfo = activeStreams.get(streamId);
            if (streamInfo && streamInfo.cancelled) {
                // Clear summary interval
                if (accumulatedData.summaryInterval) {
                    clearInterval(accumulatedData.summaryInterval);
                    accumulatedData.summaryInterval = null;
                    if (streamInfo) {
                        streamInfo.summaryInterval = null;
                    }
                }
                event.sender.send('chat-stream-cancelled', { streamId });
                cleanupStream(streamId);
                return { cancelled: true };
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            const isToolUseFailedError = error?.error?.code === 'tool_use_failed' || errorMessage.includes('tool_use_failed');
            const isToolValidationError = errorMessage.includes('Tool call validation failed') || 
                                         errorMessage.includes('was not in request.tools');

            if ((isToolUseFailedError || isToolValidationError) && retryCount < MAX_TOOL_USE_RETRIES) {
                retryCount++;
                
                // Bump temperature by 0.05 per retry
                chatCompletionParams.temperature = baseTemperature + (retryCount * 0.05);
                
                // Notify client of retry attempt
                event.sender.send('chat-stream-retry', {
                    attempt: retryCount,
                    maxAttempts: MAX_TOOL_USE_RETRIES,
                    error: errorMessage,
                    newTemperature: chatCompletionParams.temperature
                });
                
                // Append error to the last user message in the request (not in UI)
                const lastUserMessageIndex = chatCompletionParams.messages.map((m, i) => ({ role: m.role, index: i }))
                    .filter(m => m.role === 'user')
                    .pop()?.index;
                
                if (lastUserMessageIndex !== undefined) {
                    const lastUserMsg = chatCompletionParams.messages[lastUserMessageIndex];
                    
                    // Handle both string and array content formats
                    if (typeof lastUserMsg.content === 'string') {
                        lastUserMsg.content += `\n\n[Note: Previous attempt failed with error: ${errorMessage}]`;
                    } else if (Array.isArray(lastUserMsg.content)) {
                        // Find the last text part or add one
                        const lastTextPart = lastUserMsg.content.filter(p => p.type === 'text').pop();
                        if (lastTextPart) {
                            lastTextPart.text += `\n\n[Note: Previous attempt failed with error: ${errorMessage}]`;
                        } else {
                            lastUserMsg.content.push({
                                type: 'text',
                                text: `\n[Note: Previous attempt failed with error: ${errorMessage}]`
                            });
                        }
                    }
                }
                
                // Wait 0.5 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }

            // Clear summary interval
            if (accumulatedData.summaryInterval) {
                clearInterval(accumulatedData.summaryInterval);
                accumulatedData.summaryInterval = null;
                const currentStreamInfo = activeStreams.get(streamId);
                if (currentStreamInfo) {
                    currentStreamInfo.summaryInterval = null;
                }
            }
            
            if (settings.deferProviderErrors && !accumulatedData.content && !accumulatedData.reasoning && accumulatedData.toolCalls.length === 0) {
                return { success: false, error: errorMessage };
            }
            cleanupStream(streamId);
            event.sender.send('chat-stream-error', {
                error: `Failed to get chat completion: ${errorMessage}`,
                details: error
            });
            return;
        }
    }

    cleanupStream(streamId);
    event.sender.send('chat-stream-error', {
        error: `The model repeatedly failed to use tools correctly after ${MAX_TOOL_USE_RETRIES + 1} attempts. Please try rephrasing your request.`
    });
}

function handleResponsesApiEvent(data, event, streamId) {
    switch (data.type) {
        case 'response.output_text.delta':
            event.sender.send('chat-stream-content', { content: data.delta });
            break;
        case 'response.output_item.added':
            if (data.item.type === 'mcp_call') {
                event.sender.send('chat-stream-tool-execution', {
                    type: 'start',
                    tool: {
                        index: data.output_index,
                        type: 'function',
                        name: data.item.name,
                        arguments: data.item.arguments || "",
                        server_label: data.item.server_label
                    }
                });
            }
            break;
        case 'response.output_item.done':
            if (data.item.type === 'mcp_call') {
                event.sender.send('chat-stream-tool-execution', {
                    type: 'complete',
                    tool: {
                        index: data.output_index,
                        name: data.item.name,
                        output: data.item.output
                    }
                });
            }
            break;
    }
}

async function handleResponsesApiStream(event, messages, model, settings, modelContextSizes, discoveredTools) {
    // Get sender ID to track streams per webContents (prevents duplicate streams during HMR)
    const senderId = event.sender.id;
    
    // Cancel any existing streams from this sender before starting a new one
    const existingStreamId = streamsBySender.get(senderId);
    if (existingStreamId) {
        console.log(`[ChatHandler Responses API] Cancelling existing stream ${existingStreamId} for sender ${senderId}`);
        const existingStream = activeStreams.get(existingStreamId);
        if (existingStream) {
            existingStream.cancelled = true;
            // Try to destroy the stream if it exists
            if (existingStream.stream && typeof existingStream.stream.destroy === 'function') {
                existingStream.stream.destroy();
            }
        }
        cleanupStream(existingStreamId);
    }
    
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track this stream by sender
    streamsBySender.set(senderId, streamId);
    
    try {
        activeStreams.set(streamId, {
            cancelled: false,
            stream: null, 
            event: event,
            summaryInterval: null
        });

        const { modelToUse, modelInfo, modelProvider } = determineModel(model, settings, modelContextSizes);
        const resolvedProvider = modelProvider || modelInfo?.provider || (model && model.includes('::') ? model.split('::')[0] : settings.provider) || 'groq';
        const streamSettings = {
            ...settings,
            provider: resolvedProvider,
            model: modelToUse
        };
        validateApiKey(streamSettings);
        const providerApiKey = getActiveApiKey(streamSettings);

        // Check if we need to refresh Google OAuth token before using connectors
        let currentSettings = settings;
        const hasGoogleConnectors = settings.googleConnectors?.gmail || 
                                    settings.googleConnectors?.calendar || 
                                    settings.googleConnectors?.drive;
        
        if (hasGoogleConnectors) {
            try {
                const { token, settings: updatedSettings } = await googleOAuthManager.getValidAccessToken(settings);
                if (updatedSettings !== settings) {
                    currentSettings = updatedSettings;
                    console.log('[ChatHandler] Google OAuth token was refreshed');
                }
            } catch (error) {
                console.error('[ChatHandler] Error refreshing Google OAuth token:', error);
                // Continue with existing token
            }
        }

        // Prepare Connectors
        const tools = [];
        const remotePrefixes = new Set();
        
        if (currentSettings.googleConnectors?.gmail && currentSettings.googleOAuthToken) {
            remotePrefixes.add("gmail");
            tools.push({
                type: "mcp",
                server_label: "gmail",
                connector_id: "connector_gmail",
                authorization: currentSettings.googleOAuthToken,
                require_approval: currentSettings.googleConnectorsApproval?.gmail || "never"
            });
        }
        if (currentSettings.googleConnectors?.calendar && currentSettings.googleOAuthToken) {
            remotePrefixes.add("google_calendar");
            tools.push({
                type: "mcp",
                server_label: "google_calendar",
                connector_id: "connector_googlecalendar",
                authorization: currentSettings.googleOAuthToken,
                require_approval: currentSettings.googleConnectorsApproval?.calendar || "never"
            });
        }
        if (currentSettings.googleConnectors?.drive && currentSettings.googleOAuthToken) {
            remotePrefixes.add("google_drive");
            tools.push({
                type: "mcp",
                server_label: "google_drive",
                connector_id: "connector_googledrive",
                authorization: currentSettings.googleOAuthToken,
                require_approval: currentSettings.googleConnectorsApproval?.drive || "never"
            });
        }

        // Add Remote MCP Servers
        if (currentSettings.remoteMcpServers && typeof currentSettings.remoteMcpServers === 'object') {
            for (const [serverId, serverConfig] of Object.entries(currentSettings.remoteMcpServers)) {
                // Skip disabled servers (enabled defaults to true if not specified)
                if (serverConfig.enabled === false) {
                    console.log(`[ChatHandler] Remote MCP server ${serverId} is disabled, skipping`);
                    continue;
                }
                
                if (!serverConfig.serverUrl) {
                    console.warn(`[ChatHandler] Remote MCP server ${serverId} missing serverUrl, skipping`);
                    continue;
                }
                
                const label = serverConfig.serverLabel || serverId;
                remotePrefixes.add(label);
                // Add normalized version (snake_case) as Groq normalizes labels in function names
                remotePrefixes.add(label.toLowerCase().replace(/\s+/g, '_'));

                const remoteMcpTool = {
                    type: "mcp",
                    server_label: label,
                    server_url: serverConfig.serverUrl,
                    require_approval: serverConfig.requireApproval || "never"
                };
                
                // Add server_description if provided
                if (serverConfig.serverDescription) {
                    remoteMcpTool.server_description = serverConfig.serverDescription;
                }
                
                // Add headers if provided
                if (serverConfig.headers && Object.keys(serverConfig.headers).length > 0) {
                    remoteMcpTool.headers = serverConfig.headers;
                }
                
                // Add allowed_tools if provided (filters which tools are available)
                if (serverConfig.allowedTools && Array.isArray(serverConfig.allowedTools) && serverConfig.allowedTools.length > 0) {
                    remoteMcpTool.allowed_tools = serverConfig.allowedTools;
                }
                
                tools.push(remoteMcpTool);
                console.log(`[ChatHandler] Added remote MCP server: ${serverId} (${serverConfig.serverUrl})`);
            }
        }

        // Add discoveredTools (Client-side tools)
        if (discoveredTools && discoveredTools.length > 0) {
            const clientTools = prepareTools(discoveredTools, true, settings); // true = isResponsesApi
            tools.push(...clientTools);
        } else if (settings.webSearch?.enabled !== false) {
            const clientTools = prepareTools([], true, settings);
            tools.push(...clientTools);
        }

        // Prepare Input and Instructions
        let instructions = undefined;
        const input = [];
        
        // Helper to find tool output
        const findToolOutput = (id) => messages.find(m => m.role === 'tool' && m.tool_call_id === id);

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            if (msg.role === 'system') {
                instructions = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                continue;
            }

            if (msg.role === 'tool') {
                continue; // Skip, handled via assistant message
            }

            // Handle MCP approval requests (from previous response output, being echoed back)
            if (msg.type === 'mcp_approval_request') {
                input.push({
                    type: 'mcp_approval_request',
                    id: msg.id,
                    name: msg.name,
                    server_label: msg.server_label,
                    arguments: msg.arguments
                });
                continue;
            }

            // Handle MCP approval responses
            if (msg.type === 'mcp_approval_response') {
                input.push({
                    type: 'mcp_approval_response',
                    approval_request_id: msg.approval_request_id,
                    approve: msg.approve,
                    ...(msg.reason && { reason: msg.reason })
                });
                continue;
            }

            if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
                // 1. Add text content if present
                let contentText = "";
                if (typeof msg.content === 'string') {
                    contentText = msg.content;
                } else if (Array.isArray(msg.content)) {
                    contentText = msg.content.map(p => p.text || "").join("");
                }
                
                if (contentText) {
                    input.push({
                        role: 'assistant',
                        content: contentText
                    });
                }

                // 2. Add tool calls
                for (const toolCall of msg.tool_calls) {
                    const outputMsg = findToolOutput(toolCall.id);
                    const outputContent = outputMsg ? (typeof outputMsg.content === 'string' ? outputMsg.content : JSON.stringify(outputMsg.content)) : undefined;

                    if (toolCall.server_label) {
                        // MCP Call
                        const mcpItem = {
                            type: "mcp_call",
                            id: toolCall.id, // Use the ID we have
                            name: toolCall.function.name,
                            arguments: toolCall.function.arguments,
                            server_label: toolCall.server_label,
                        };
                        
                        if (outputContent) {
                            mcpItem.status = "completed";
                            mcpItem.output = outputContent;
                        }
                        
                        input.push(mcpItem);
                    } else {
                        // Standard Function Call
                        input.push({
                            type: "function_call",
                            id: toolCall.id,
                            call_id: toolCall.id,
                            name: toolCall.function.name,
                            arguments: toolCall.function.arguments
                        });
                        
                        if (outputContent) {
                            input.push({
                                type: "function_call_output",
                                call_id: toolCall.id,
                                output: outputContent
                            });
                        }
                    }
                }
                continue;
            }

            // Standard message
            let contentText = "";
            if (typeof msg.content === 'string') {
                contentText = msg.content;
            } else if (Array.isArray(msg.content)) {
                contentText = msg.content.map(p => p.text || "").join("");
            }
            
            input.push({
                role: msg.role,
                content: contentText
            });
        }

        const apiParams = {
            model: modelToUse,
            stream: true,
            input: input,
            tools: tools.length > 0 ? tools : undefined,
            instructions: instructions,
            store: false // Groq Responses API does not support stateful conversations yet
        };

        const body = JSON.stringify(apiParams);

        // Write request payload to /tmp if logging is enabled
        let requestFilePath = null;
        let responseFilePath = null;
        let responseChunks = [];
        if (settings.logApiRequests) {
            const requestTimestamp = Date.now();
            requestFilePath = path.join('/tmp', `responses-api-request-${requestTimestamp}-${streamId}.json`);
            fs.writeFileSync(requestFilePath, JSON.stringify(apiParams, null, 2));
            console.log(`[ChatHandler] Responses API request payload written to: ${requestFilePath}`);

            // Create response file path
            responseFilePath = path.join('/tmp', `responses-api-response-${requestTimestamp}-${streamId}.json`);
        }

        const response = await fetch(`${getProviderBaseUrl(settings) || 'https://api.groq.com/openai/v1'}/responses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${providerApiKey}`,
                "Groq-Beta": "inference-metrics"
            },
            body: body
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        event.sender.send('chat-stream-start', {
            id: streamId,
            role: "assistant"
        });

        let accumulatedContent = "";
        let accumulatedReasoning = ""; // Track reasoning
        let buffer = "";
        const stream = response.body;
        
        // Track errors and failures
        const accumulatedData = {
            error: null,
            failed: false,
            failureReason: null,
            apiStatus: null // Store the status from response.done/response.completed
        };
        
        // Store stream for cancellation (if supported by node-fetch/stream)
        // We can't easily abort node-fetch v2 without AbortController (Node 15+)
        // But we can destroy the stream.
        if (activeStreams.get(streamId)) {
            activeStreams.get(streamId).stream = stream;
        }

        const toolCallsMap = new Map(); // id -> toolCall object
        const toolOutputsMap = new Map(); // id -> output

        stream.on('data', (chunk) => {
            if (activeStreams.get(streamId)?.cancelled) {
                stream.destroy(); // Stop stream
                return;
            }
            
            // Accumulate raw chunk data if logging is enabled
            if (settings.logApiRequests) {
                responseChunks.push(chunk.toString());
            }
            
            buffer += chunk.toString();
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); 
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(jsonStr);

                        // Inline handling to access accumulators
                        switch (data.type) {
                            case 'error':
                                console.error('[Responses API] Error event received:', data);
                                // Store error for later handling
                                accumulatedData.error = data.error || data.message || 'Unknown error';
                                break;
                                
                            case 'response.failed':
                                console.error('[Responses API] Response failed:', data);
                                // Store failure details
                                accumulatedData.failed = true;
                                accumulatedData.failureReason = data.response?.error?.message || 'Response generation failed';
                                break;
                            
                            case 'response.output_text.delta':
                                accumulatedContent += data.delta;
                                event.sender.send('chat-stream-content', { content: data.delta });
                                break;

                            case 'response.reasoning_text.delta':
                                accumulatedReasoning += data.delta;
                                event.sender.send('chat-stream-reasoning', { 
                                    reasoning: data.delta, 
                                    accumulated: accumulatedReasoning 
                                });
                                break;
                                
                            case 'response.output_item.added':
                                if (data.item.type === 'mcp_approval_request') {
                                    // Remote MCP server requires approval before executing tool
                                    console.log('[Responses API] MCP approval request received:', data.item);
                                    event.sender.send('chat-stream-mcp-approval-request', {
                                        id: data.item.id,
                                        name: data.item.name,
                                        server_label: data.item.server_label,
                                        arguments: data.item.arguments
                                    });
                                    
                                    // Store the approval request for later handling
                                    if (!accumulatedData.mcpApprovalRequests) {
                                        accumulatedData.mcpApprovalRequests = [];
                                    }
                                    accumulatedData.mcpApprovalRequests.push({
                                        id: data.item.id,
                                        name: data.item.name,
                                        server_label: data.item.server_label,
                                        arguments: data.item.arguments
                                    });
                                } else if (data.item.type === 'mcp_call' || data.item.type === 'function_call') {
                                    // Groq sends duplicate function_call events for mcp_call remote tools.
                                    // Filter out function_call if it follows the remote naming pattern (server__tool)
                                    // We verify against known remote prefixes to avoid false positives
                                    let isShadow = false;
                                    if (data.item.type === 'function_call' && data.item.name) {
                                        const parts = data.item.name.split('__');
                                        if (parts.length > 1 && remotePrefixes.has(parts[0])) {
                                            isShadow = true;
                                        }
                                    }
                                    
                                    if (isShadow) {
                                        console.log(`[Responses API] Ignoring shadow function_call for remote tool: ${data.item.name}`);
                                        if (!accumulatedData.ignoredToolCallIds) accumulatedData.ignoredToolCallIds = new Set();
                                        accumulatedData.ignoredToolCallIds.add(data.item.id);
                                        break;
                                    }

                                    // mcp_call = remote MCP server tool (executed by Groq)
                                    // function_call = local tool (needs client-side execution)
                                    const isRemoteMcp = data.item.type === 'mcp_call';
                                    
                                    const toolCall = {
                                        index: data.output_index,
                                        id: data.item.id,
                                        type: 'function',
                                        function: {
                                            name: data.item.name,
                                            arguments: data.item.arguments || ""
                                        },
                                        // Mark remote MCP tools - use server_label from item or 'remote' as fallback
                                        server_label: isRemoteMcp ? (data.item.server_label || 'remote') : undefined
                                    };
                                    toolCallsMap.set(data.item.id, toolCall);
                                    
                                    // Emit tool execution start for "compound" style UI (optional but good for consistency)
                                    event.sender.send('chat-stream-tool-execution', {
                                        type: 'start',
                                        tool: {
                                            index: data.output_index,
                                            type: 'function',
                                            name: data.item.name,
                                            arguments: data.item.arguments || "",
                                            server_label: isRemoteMcp ? (data.item.server_label || 'remote') : undefined
                                        }
                                    });
                                    
                                    // Emit standard tool calls update
                                    event.sender.send('chat-stream-tool-calls', { 
                                        tool_calls: Array.from(toolCallsMap.values()) 
                                    });
                                }
                                break;
                                
                            case 'response.mcp_call_arguments.delta':
                            case 'response.function_call_arguments.delta':
                                if (accumulatedData.ignoredToolCallIds?.has(data.item_id)) {
                                    break;
                                }
                                if (toolCallsMap.has(data.item_id)) {
                                    const tc = toolCallsMap.get(data.item_id);
                                    tc.function.arguments += data.delta;
                                    // Update map
                                    toolCallsMap.set(data.item_id, tc);
                                    // Re-emit tool calls
                                    event.sender.send('chat-stream-tool-calls', { 
                                        tool_calls: Array.from(toolCallsMap.values()) 
                                    });
                                } else {
                                    console.warn(`[Responses API] Received delta for unknown tool call: ${data.item_id}`);
                                }
                                break;
                                
                            case 'response.done':
                            case 'response.completed':
                                // Capture the API-reported status for proper finish_reason handling
                                // This event contains the actual status from Groq (e.g., 'completed', 'requires_action', 'incomplete')
                                if (data.response?.status) {
                                    accumulatedData.apiStatus = data.response.status;
                                } else if (data.status) {
                                    accumulatedData.apiStatus = data.status;
                                }
                                // Capture usage data from response.completed event
                                if (data.response?.usage) {
                                    const usage = data.response.usage;
                                    const metrics = data.response.groq?.metrics || data.response.metadata;
                                    // Calculate completion_time from metrics if available
                                    const completionTime = metrics?.completion_time 
                                        ? parseFloat(metrics.completion_time) 
                                        : null;
                                    const promptTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
                                    const completionTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
                                    const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);
                                    accumulatedData.usage = {
                                        total_tokens: totalTokens,
                                        prompt_tokens: promptTokens,
                                        completion_tokens: completionTokens,
                                        completion_time: completionTime
                                    };
                                }
                                break;

                            case 'response.output_item.done':
                                if (data.item.type === 'mcp_approval_request') {
                                    // Handle completion of MCP approval request - emit final data
                                    console.log('[Responses API] MCP approval request done:', data.item);
                                    
                                    // Ensure it's in the accumulated data
                                    if (!accumulatedData.mcpApprovalRequests) {
                                        accumulatedData.mcpApprovalRequests = [];
                                    }
                                    
                                    // Check if we already have this request (from 'added' event)
                                    const existingIdx = accumulatedData.mcpApprovalRequests.findIndex(r => r.id === data.item.id);
                                    if (existingIdx === -1) {
                                        accumulatedData.mcpApprovalRequests.push({
                                            id: data.item.id,
                                            name: data.item.name,
                                            server_label: data.item.server_label,
                                            arguments: data.item.arguments
                                        });
                                        
                                        // Emit the request to frontend
                                        event.sender.send('chat-stream-mcp-approval-request', {
                                            id: data.item.id,
                                            name: data.item.name,
                                            server_label: data.item.server_label,
                                            arguments: data.item.arguments
                                        });
                                    }
                                } else if (data.item.type === 'mcp_call' || data.item.type === 'function_call') {
                                    // Ignore shadow function_call for remote tools
                                    if (data.item.type === 'function_call' && data.item.name) {
                                        const parts = data.item.name.split('__');
                                        if (parts.length > 1 && remotePrefixes.has(parts[0])) {
                                            break;
                                        }
                                    }

                                    // mcp_call = remote MCP server tool (executed by Groq)
                                    // function_call = local tool (needs client-side execution)
                                    const isRemoteMcp = data.item.type === 'mcp_call';
                                    
                                    // Robustness: Ensure tool call exists in map even if 'added' was missed
                                    if (!toolCallsMap.has(data.item.id)) {
                                        toolCallsMap.set(data.item.id, {
                                            index: data.output_index,
                                            id: data.item.id,
                                            type: 'function',
                                            function: {
                                                name: data.item.name,
                                                arguments: data.item.arguments || ""
                                            },
                                            server_label: isRemoteMcp ? (data.item.server_label || 'remote') : undefined
                                        });
                                    }

                                    // Ensure final arguments are set
                                    if (toolCallsMap.has(data.item.id)) {
                                        const tc = toolCallsMap.get(data.item.id);
                                        // Prefer complete arguments from item if available
                                        if (data.item.arguments) {
                                            tc.function.arguments = data.item.arguments;
                                        }
                                        // Ensure server_label is set for mcp_call
                                        if (isRemoteMcp && !tc.server_label) {
                                            tc.server_label = data.item.server_label || 'remote';
                                        }
                                        toolCallsMap.set(data.item.id, tc);
                                    }
                                    
                                    // Capture output (only for MCP calls - they return outputs)
                                    if (data.item.output) {
                                        toolOutputsMap.set(data.item.id, data.item.output);
                                        
                                        // Only emit completion event if there's an actual output
                                        // (MCP calls have outputs, client-side function calls don't)
                                        event.sender.send('chat-stream-tool-execution', {
                                            type: 'complete',
                                            tool: {
                                                index: data.output_index,
                                                name: data.item.name,
                                                output: data.item.output,
                                                server_label: isRemoteMcp ? (data.item.server_label || 'remote') : undefined
                                            }
                                        });
                                    }
                                    
                                    // Re-emit tool calls (final state)
                                    event.sender.send('chat-stream-tool-calls', { 
                                        tool_calls: Array.from(toolCallsMap.values()) 
                                    });
                                }
                                break;
                        }
                        
                    } catch (e) {
                        console.error('[Responses API] JSON Parse Error:', e);
                        console.error('[Responses API] Bad JSON:', jsonStr);
                    }
                }
            }
        });

        stream.on('end', () => {
             if (!activeStreams.get(streamId)?.cancelled) {
                 // Check for errors or failures first
                 if (accumulatedData.error || accumulatedData.failed) {
                     const errorMessage = accumulatedData.error || accumulatedData.failureReason || 'Response generation failed';
                     console.error('[Responses API] Stream ended with error:', errorMessage);
                     // Write response chunks if logging is enabled and there are any
                     if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                         fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                         console.log(`[ChatHandler] Responses API response chunks written to: ${responseFilePath}`);
                     }
                     event.sender.send('chat-stream-error', { error: errorMessage });
                     cleanupStream(streamId);
                     return;
                 }
                 
                 // Prepare tool responses list (only for MCP calls that returned outputs)
                 const toolResponses = [];
                 const executedTools = []; // For UI display of completed MCP tools
                 
                 toolOutputsMap.forEach((output, id) => {
                     toolResponses.push({
                         tool_call_id: id,
                         content: typeof output === 'string' ? output : JSON.stringify(output)
                     });
                     
                     if (toolCallsMap.has(id)) {
                         const toolCall = toolCallsMap.get(id);
                         executedTools.push({
                             index: toolCall.index,
                             type: toolCall.type,
                             name: toolCall.function.name,
                             arguments: toolCall.function.arguments,
                             output: output,
                             server_label: toolCall.server_label
                         });
                     }
                 });

                 // Determine finish_reason based on API status and tool state:
                 // 1. Use API-reported status when available ('requires_action' = tool_calls needed)
                 // 2. Check for MCP approval requests
                 // 3. Check for local tools that need client-side execution
                 // 4. Default to "stop" for completed responses
                 let finishReason = "stop";
                 
                 // Check API-reported status first (most reliable)
                 if (accumulatedData.apiStatus === 'requires_action' || accumulatedData.apiStatus === 'incomplete') {
                     // API explicitly says action is required (tool calls need execution)
                     finishReason = "tool_calls";
                 } else if (accumulatedData.mcpApprovalRequests && accumulatedData.mcpApprovalRequests.length > 0) {
                     // Remote MCP tools need approval before execution
                     finishReason = "mcp_approval_required";
                 } else if (toolCallsMap.size > 0 && toolOutputsMap.size === 0) {
                     // Fallback: Client-side tools that need execution (local function calls without server-side outputs)
                     finishReason = "tool_calls";
                 } else if (toolCallsMap.size > 0 && toolOutputsMap.size < toolCallsMap.size) {
                     // Mixed tools: some remote (have outputs), some local (need execution)
                     finishReason = "tool_calls";
                 }

                // Write response chunks if logging is enabled
                if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                    fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                    console.log(`[ChatHandler] Responses API response chunks written to: ${responseFilePath}`);
                }

                let finalContent = accumulatedContent;
                let finalReasoning = accumulatedReasoning;
                const thinkResult = extractThinking(finalContent);
                if (thinkResult.hasThink) {
                    finalContent = thinkResult.cleanContent;
                    finalReasoning = [finalReasoning, thinkResult.thinking].filter(Boolean).join('\n\n---\n\n');
                }

                event.sender.send('chat-stream-complete', {
                    content: finalContent,
                    role: "assistant",
                    finish_reason: finishReason,
                    tool_calls: toolCallsMap.size > 0 ? Array.from(toolCallsMap.values()) : undefined,
                    pre_calculated_tool_responses: toolResponses.length > 0 ? toolResponses : undefined,
                    executed_tools: executedTools.length > 0 ? executedTools : undefined,
                    reasoning: finalReasoning || undefined,
                    mcp_approval_requests: accumulatedData.mcpApprovalRequests || undefined,
                    usage: accumulatedData.usage || undefined
                });
                 cleanupStream(streamId);
             }
        });
        
        stream.on('error', (err) => {
             if (!activeStreams.get(streamId)?.cancelled) {
                 // Write response chunks if logging is enabled and there are any
                 if (settings.logApiRequests && responseFilePath && responseChunks.length > 0) {
                     fs.writeFileSync(responseFilePath, JSON.stringify(responseChunks, null, 2));
                     console.log(`[ChatHandler] Responses API response chunks written to: ${responseFilePath}`);
                 }
                 event.sender.send('chat-stream-error', { error: err.message });
                 cleanupStream(streamId);
             }
        });

    } catch (error) {
        cleanupStream(streamId);
        event.sender.send('chat-stream-error', { error: error.message });
    }
}

/**
 * Create and configure a Groq SDK client instance according to active provider settings,
 * including baseUrl stripping if the provider baseUrl ends in /v1/.
 */
function createGroqClient(settings) {
    const providerApiKey = getActiveApiKey(settings);
    const providerBaseUrl = getProviderBaseUrl(settings);
    const groqConfig = { apiKey: providerApiKey };

    if (providerBaseUrl) {
        groqConfig.baseURL = providerBaseUrl;
    }

    const groq = new Groq(groqConfig);

    // The groq-sdk resource paths include an /openai/v1/ prefix. When a
    // baseURL that already ends in /v1/ is used, strip that prefix so the
    // requests land on the right endpoint (works for every OpenAI-compatible
    // provider: Groq, OpenAI, Mistral, xAI, DeepSeek, OpenRouter, custom...).
    if (providerBaseUrl) {
        const originalBuildURL = groq.buildURL.bind(groq);

        groq.buildURL = function(path, query) {
            if (path.startsWith('/openai/v1/')) {
                path = path.replace(/^\/openai\/v1/, '');
            }
            return originalBuildURL(path, query);
        };
    }

    return groq;
}

/**
 * Handles streaming chat completions with support for compound-beta model features.
 * Supports progressive reasoning display, executed tools streaming, and MCP tool calls.
 * 
 * @param {Electron.IpcMainEvent} event - The IPC event object
 * @param {Array<object>} messages - Chat history messages
 * @param {string} model - Model name (optional, falls back to settings)
 * @param {object} settings - App settings including API key and model config
 * @param {object} modelContextSizes - Model capability metadata
 * @param {Array<object>} discoveredTools - Available MCP tools
 */
async function handleChatStream(event, messages, model, settings, modelContextSizes, discoveredTools) {
    // Get sender ID to track streams per webContents (prevents duplicate streams during HMR)
    const senderId = event.sender.id;
    
    // Cancel any existing streams from this sender before starting a new one
    // This prevents duplicate responses when HMR reloads the renderer
    const existingStreamId = streamsBySender.get(senderId);
    if (existingStreamId) {
        console.log(`[ChatHandler] Cancelling existing stream ${existingStreamId} for sender ${senderId} before starting new stream`);
        const existingStream = activeStreams.get(existingStreamId);
        if (existingStream) {
            existingStream.cancelled = true;
        }
        cleanupStream(existingStreamId);
    }
    
    // Check if Responses API should be used
    if (settings.useResponsesApi) {
        return handleResponsesApiStream(event, messages, model, settings, modelContextSizes, discoveredTools);
    }

    // Generate unique stream ID
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track this stream by sender
    streamsBySender.set(senderId, streamId);
    
    try {
        // Register this stream as active
        activeStreams.set(streamId, {
            cancelled: false,
            stream: null,
            event: event,
            summaryInterval: null
        });

        const { modelToUse, modelInfo, modelProvider } = determineModel(model, settings, modelContextSizes);
        const visionCheckPassed = checkVisionSupport(messages, modelInfo, modelToUse, event);
        
        // If vision check failed, return early
        if (!visionCheckPassed) {
            cleanupStream(streamId);
            return;
        }

        const tools = prepareTools(discoveredTools, false, settings);
        const cleanedMessages = cleanMessages(messages);
        const resolvedProvider = modelProvider || modelInfo?.provider || (model && model.includes('::') ? model.split('::')[0] : settings.provider) || 'groq';
        const primarySettings = {
            ...settings,
            provider: resolvedProvider,
            model: modelToUse
        };
        const candidates = getProviderCandidates(primarySettings);
        let lastError = null;
        for (const [candidateIndex, candidate] of candidates.entries()) {
            const candidateModel = candidateIndex === 0 ? modelToUse : (candidate.model || getDefaultModel(candidate));
            try {
                validateApiKey(candidate);
            } catch (error) {
                lastError = error.message;
                continue;
            }
            const prunedMessages = pruneMessageHistory(cleanedMessages, candidateModel, modelContextSizes);
            const chatCompletionParams = buildApiParams(prunedMessages, candidateModel, candidate, tools, modelContextSizes);
            const result = await executeStreamWithRetry(createGroqClient(candidate), chatCompletionParams, event, streamId, { ...candidate, deferProviderErrors: true });
            if (result?.success) return;
            if (result?.cancelled) return;
            lastError = result?.error || 'Provider failed';
            event.sender.send('chat-stream-retry', { providerFallback: true, failedProvider: candidate.provider, nextProvider: candidates[candidateIndex + 1]?.provider, error: lastError });
        }
        cleanupStream(streamId);
        event.sender.send('chat-stream-error', { error: `All configured providers failed: ${lastError || 'unknown error'}` });
    } catch (outerError) {
        cleanupStream(streamId);
        event.sender.send('chat-stream-error', { error: outerError.message || `Setup error: ${outerError}` });
    }
}

/**
 * Stops an active chat stream
 * @param {string} streamId - The ID of the stream to stop (optional, stops all if not provided)
 */
function stopChatStream(streamId) {
    if (streamId) {
        const streamInfo = activeStreams.get(streamId);
        if (streamInfo) {
            streamInfo.cancelled = true;
            // Clear the summary interval if it exists
            if (streamInfo.summaryInterval) {
                clearInterval(streamInfo.summaryInterval);
                streamInfo.summaryInterval = null;
            }
            // Note: The actual stream interruption happens in the iteration loop
        }
    } else {
        // Stop all active streams
        for (const [id, streamInfo] of activeStreams.entries()) {
            streamInfo.cancelled = true;
            // Clear the summary interval if it exists
            if (streamInfo.summaryInterval) {
                clearInterval(streamInfo.summaryInterval);
                streamInfo.summaryInterval = null;
            }
        }
    }
}

/**
 * Runs a single model stream for comparison mode
 */
async function runSingleStreamForCompare(event, messages, model, settings, modelContextSizes, channelSuffix) {
    const streamId = `compare_${channelSuffix}_${Date.now()}`;
    activeStreams.set(streamId, { cancelled: false, stream: null, event });

    try {
        const { modelToUse, modelInfo, modelProvider } = determineModel(model, settings, modelContextSizes);
        const resolvedProvider = modelProvider || modelInfo?.provider || (model && model.includes('::') ? model.split('::')[0] : settings.provider) || 'groq';
        const modelSettings = {
            ...settings,
            provider: resolvedProvider,
            model: modelToUse
        };
        validateApiKey(modelSettings);
        const visionCheckPassed = checkVisionSupport(messages, modelInfo, modelToUse, event);
        if (!visionCheckPassed) {
            cleanupStream(streamId);
            return;
        }

        const groq = createGroqClient(modelSettings);

        const cleanedMessages = cleanMessages(messages);
        const prunedMessages = pruneMessageHistory(cleanedMessages, modelToUse, modelContextSizes);

        // Include system prompt if available
        const customSystemMessages = prunedMessages.filter(m => m.role === 'system');
        const nonSystemMessages = prunedMessages.filter(m => m.role !== 'system');
        let systemPrompt = 'You are a helpful assistant. Format responses using Markdown.';
        if (settings.customSystemPrompt && settings.customSystemPrompt.trim()) {
            systemPrompt = settings.customSystemPrompt.trim();
        }
        if (customSystemMessages.length > 0) {
            const customPromptText = customSystemMessages
                .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
                .join('\n\n');
            systemPrompt += `\n\n${customPromptText}`;
        }

        const apiMessages = [{ role: 'system', content: systemPrompt }, ...nonSystemMessages];

        const startTime = Date.now();
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let isFirstChunk = true;
        let ttft = 0;

        const apiParams = {
            messages: apiMessages,
            model: modelToUse,
            stream: true,
            temperature: settings.temperature ?? 0.7,
            top_p: settings.top_p ?? 0.95,
        };

        if (settings.maxTokens) {
            apiParams.max_tokens = settings.maxTokens;
        }

        if (modelToUse.includes('gpt-oss') && settings.reasoning_effort) {
            apiParams.reasoning_effort = settings.reasoning_effort;
        }

        const stream = await groq.chat.completions.create(apiParams);

        const streamInfo = activeStreams.get(streamId);
        if (streamInfo) streamInfo.stream = stream;

        for await (const chunk of stream) {
            if (activeStreams.get(streamId)?.cancelled) break;

            const delta = chunk.choices?.[0]?.delta;
            if (isFirstChunk) {
                ttft = Date.now() - startTime;
                event.sender.send(`compare-stream-start-${channelSuffix}`, { model: modelToUse, ttft });
                isFirstChunk = false;
            }

            if (delta?.content) {
                accumulatedContent += delta.content;
                event.sender.send(`compare-stream-content-${channelSuffix}`, { content: delta.content, accumulated: accumulatedContent });
            }

            const reasoningDelta = delta?.reasoning || delta?.reasoning_content;
            if (reasoningDelta) {
                accumulatedReasoning += reasoningDelta;
                event.sender.send(`compare-stream-reasoning-${channelSuffix}`, { reasoning: reasoningDelta, accumulated: accumulatedReasoning });
            }
        }

        const durationMs = Date.now() - startTime;
        const estTokens = Math.round(accumulatedContent.length / 3.8);
        const speedTps = durationMs > 0 ? (estTokens / (durationMs / 1000)).toFixed(1) : 0;

        event.sender.send(`compare-stream-complete-${channelSuffix}`, {
            model: modelToUse,
            content: accumulatedContent,
            reasoning: accumulatedReasoning,
            durationMs,
            estimatedTokens: estTokens,
            tokensPerSec: speedTps,
            ttft
        });
    } catch (error) {
        console.error(`[CompareStream ${channelSuffix}] Error:`, error);
        event.sender.send(`compare-stream-error-${channelSuffix}`, { error: error.message });
    } finally {
        cleanupStream(streamId);
    }
}

/**
 * Handles concurrent multi-model chat stream for side-by-side comparison
 */
async function handleCompareChatStream(event, messages, modelA, modelB, settings, modelContextSizes) {
    return Promise.all([
        runSingleStreamForCompare(event, messages, modelA, settings, modelContextSizes, 'a'),
        runSingleStreamForCompare(event, messages, modelB, settings, modelContextSizes, 'b')
    ]);
}

module.exports = { handleChatStream, handleCompareChatStream, stopChatStream, createGroqClient };

