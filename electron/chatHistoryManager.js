const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const { getActiveApiKey, getProviderBaseUrl, getDefaultModel } = require('../shared/providers');
const { createGroqClient } = require('./chatHandler');

let appInstance = null;
let settingsLoader = null;

/**
 * Initialize the chat history manager with app instance and settings loader
 * @param {Electron.App} app - The Electron app instance
 * @param {Function} loadSettings - Function to load settings
 */
function initialize(app, loadSettings) {
    appInstance = app;
    settingsLoader = loadSettings;
}

/**
 * Get the directory where chat history files are stored
 * @returns {string} Path to chat history directory
 */
function getChatHistoryDir() {
    if (!appInstance) {
        throw new Error('Chat history manager not initialized');
    }
    const userDataPath = appInstance.getPath('userData');
    const chatHistoryDir = path.join(userDataPath, 'chat-history');
    
    // Ensure directory exists
    if (!fs.existsSync(chatHistoryDir)) {
        fs.mkdirSync(chatHistoryDir, { recursive: true });
    }
    
    return chatHistoryDir;
}

/**
 * Get the path for a specific chat file
 * @param {string} chatId - The chat ID
 * @returns {string} Path to the chat file
 */
function getChatFilePath(chatId) {
    return path.join(getChatHistoryDir(), `${chatId}.json`);
}

/**
 * Create a new chat with an optional initial message and project association
 * @param {string} model - The model used for this chat
 * @param {boolean} useResponsesApi - Whether this chat uses Responses API
 * @param {string|null} projectId - Optional project ID to associate with this chat
 * @returns {Object} The new chat object
 */
function createChat(model = 'llama-3.3-70b-versatile', useResponsesApi = false, projectId = null) {
    const now = new Date().toISOString();
    const chat = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        createdAt: now,
        updatedAt: now,
        model: model,
        useResponsesApi: useResponsesApi,
        projectId: projectId || null,
        messages: []
    };
    
    // Save the empty chat
    saveChat(chat);
    
    return chat;
}

/**
 * Save a chat to disk
 * @param {Object} chat - The chat object to save
 */
function saveChat(chat) {
    const filePath = getChatFilePath(chat.id);
    chat.updatedAt = new Date().toISOString();
    
    // Clean messages for storage - remove streaming flags and other transient/API-specific data
    const cleanedChat = {
        ...chat,
        messages: chat.messages.map(msg => {
            const cleanMsg = { ...msg };
            // Remove transient streaming properties
            delete cleanMsg.isStreaming;
            delete cleanMsg.liveReasoning;
            delete cleanMsg.liveExecutedTools;
            delete cleanMsg.reasoningStartTime;
            // Remove API-specific properties that cause issues when switching modes
            delete cleanMsg.finish_reason;
            delete cleanMsg.pre_calculated_tool_responses;
            delete cleanMsg.mcp_approval_requests;
            return cleanMsg;
        })
    };
    
    fs.writeFileSync(filePath, JSON.stringify(cleanedChat, null, 2));
}

/**
 * Load a chat from disk
 * @param {string} chatId - The chat ID to load
 * @returns {Object|null} The chat object or null if not found
 */
function loadChat(chatId) {
    const filePath = getChatFilePath(chatId);
    
    if (!fs.existsSync(filePath)) {
        return null;
    }
    
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading chat ${chatId}:`, error);
        return null;
    }
}

/**
 * Delete a chat from disk
 * @param {string} chatId - The chat ID to delete
 * @returns {boolean} True if deleted successfully
 */
function deleteChat(chatId) {
    const filePath = getChatFilePath(chatId);
    
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    try {
        fs.unlinkSync(filePath);
        return true;
    } catch (error) {
        console.error(`Error deleting chat ${chatId}:`, error);
        return false;
    }
}

/**
 * Get a list of all chats (metadata only, not full messages)
 * @returns {Array} Array of chat metadata objects sorted by updatedAt descending
 */
function listChats() {
    const chatDir = getChatHistoryDir();
    const chats = [];
    
    try {
        const files = fs.readdirSync(chatDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(chatDir, file);
                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const chat = JSON.parse(data);
                    // Return only metadata, not full messages
                    chats.push({
                        id: chat.id,
                        title: chat.title,
                        createdAt: chat.createdAt,
                        updatedAt: chat.updatedAt,
                        model: chat.model,
                        messageCount: chat.messages?.length || 0,
                        useResponsesApi: chat.useResponsesApi || false,
                        projectId: chat.projectId || null
                    });
                } catch (error) {
                    console.error(`Error reading chat file ${file}:`, error);
                }
            }
        }
        
        // Sort by updatedAt descending (most recent first)
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
        console.error('Error listing chats:', error);
    }
    
    return chats;
}

/**
 * Update a chat's messages
 * @param {string} chatId - The chat ID
 * @param {Array} messages - The messages array
 */
function updateChatMessages(chatId, messages) {
    const chat = loadChat(chatId);
    if (!chat) {
        console.error(`Chat ${chatId} not found`);
        return null;
    }
    
    chat.messages = messages;
    saveChat(chat);
    return chat;
}

/**
 * Update a chat's title
 * @param {string} chatId - The chat ID
 * @param {string} title - The new title
 */
function updateChatTitle(chatId, title) {
    const chat = loadChat(chatId);
    if (!chat) {
        console.error(`Chat ${chatId} not found`);
        return null;
    }
    
    chat.title = title;
    saveChat(chat);
    return chat;
}

/**
 * Update a chat's associated project ID
 * @param {string} chatId - The chat ID
 * @param {string|null} projectId - The new project ID (or null to unassign)
 * @returns {Object|null} The updated chat object
 */
function updateChatProject(chatId, projectId) {
    const chat = loadChat(chatId);
    if (!chat) {
        console.error(`Chat ${chatId} not found`);
        return null;
    }
    
    chat.projectId = projectId || null;
    saveChat(chat);
    return chat;
}

/**
 * Unassign a project from all chats that currently reference it
 * @param {string} projectId - The project ID being deleted
 */
function unassignProjectFromChats(projectId) {
    if (!projectId) return;
    const chatDir = getChatHistoryDir();
    try {
        const files = fs.readdirSync(chatDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(chatDir, file);
                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const chat = JSON.parse(data);
                    if (chat.projectId === projectId) {
                        chat.projectId = null;
                        chat.updatedAt = new Date().toISOString();
                        fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
                    }
                } catch (err) {
                    console.error(`Error unassigning project from chat file ${file}:`, err);
                }
            }
        }
    } catch (error) {
        console.error('Error in unassignProjectFromChats:', error);
    }
}

/**
 * Generate a title for a chat based on the first user message
 * Uses the active provider's default model for fast title generation
 * @param {string} userMessage - The first user message content
 * @returns {Promise<string>} Generated title
 */
async function generateChatTitle(userMessage) {
    if (!settingsLoader) {
        console.error('Settings loader not initialized');
        return 'New Chat';
    }
    
    const settings = settingsLoader();

    const apiKey = getActiveApiKey(settings);
    if (!apiKey || apiKey === '<replace me>') {
        console.warn('API key not configured, using default title');
        return 'New Chat';
    }

    try {
        const groq = createGroqClient(settings);
        
        // Extract text content if structured message
        let textContent = userMessage;
        if (typeof userMessage !== 'string') {
            if (Array.isArray(userMessage)) {
                textContent = userMessage
                    .filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join(' ');
            } else {
                textContent = JSON.stringify(userMessage);
            }
        }
        
        // Limit the input to first 500 characters
        const truncatedMessage = textContent.slice(0, 500);
        
        // Prefer the user's selected model; fall back to the provider default
        const titleModel = (settings.model && settings.model !== 'default') ? settings.model : getDefaultModel(settings);

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that generates short, concise titles for chat conversations. Generate a title of 3-6 words that summarizes the topic or question. Do not use quotes or punctuation. Just output the title, nothing else.'
                },
                {
                    role: 'user',
                    content: `Generate a short title for a conversation that starts with this message:\n\n${truncatedMessage}`
                }
            ],
            model: titleModel,
            temperature: 0.3,
            max_tokens: 20,
            stream: false
        });
        
        const title = response.choices[0]?.message?.content?.trim() || 'New Chat';
        
        // Clean up the title - remove quotes and limit length
        return title
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
            .slice(0, 50); // Limit length
            
    } catch (error) {
        console.error('Error generating chat title:', error);
        return 'New Chat';
    }
}

/**
 * Initialize IPC handlers for chat history
 * @param {Electron.IpcMain} ipcMain - The IPC main instance
 */
function initializeChatHistoryHandlers(ipcMain) {
    // Get list of all chats
    ipcMain.handle('chat-history-list', async () => {
        return listChats();
    });
    
    // Load a specific chat
    ipcMain.handle('chat-history-load', async (event, chatId) => {
        return loadChat(chatId);
    });
    
    // Create a new chat (with optional projectId)
    ipcMain.handle('chat-history-create', async (event, model, useResponsesApi, projectId) => {
        return createChat(model, useResponsesApi, projectId);
    });
    
    // Save/update a chat
    ipcMain.handle('chat-history-save', async (event, chat) => {
        saveChat(chat);
        return { success: true };
    });
    
    // Update chat messages
    ipcMain.handle('chat-history-update-messages', async (event, chatId, messages) => {
        return updateChatMessages(chatId, messages);
    });
    
    // Update chat title
    ipcMain.handle('chat-history-update-title', async (event, chatId, title) => {
        return updateChatTitle(chatId, title);
    });

    // Update chat project
    ipcMain.handle('chat-history-update-project', async (event, chatId, projectId) => {
        return updateChatProject(chatId, projectId);
    });
    
    // Delete a chat
    ipcMain.handle('chat-history-delete', async (event, chatId) => {
        const success = deleteChat(chatId);
        return { success };
    });

    // Delete all chats
    ipcMain.handle('chat-history-delete-all', async () => {
        return deleteAllChats();
    });

    // Clear messages for a specific chat
    ipcMain.handle('chat-history-clear-messages', async (event, chatId) => {
        const chat = clearChatMessages(chatId);
        return { success: !!chat, chat };
    });
    
    // Generate a title for a chat
    ipcMain.handle('chat-history-generate-title', async (event, userMessage) => {
        return generateChatTitle(userMessage);
    });

    // Deep search in chat messages content
    ipcMain.handle('chat-history-search-content', async (event, query) => {
        return searchChatsContent(query);
    });
}

/**
 * Helper to extract plain text from a message content field
 * @param {string|Array|Object} content
 * @returns {string}
 */
function extractTextMessage(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map(part => {
                if (typeof part === 'string') return part;
                if (part && part.text) return part.text;
                return '';
            })
            .filter(Boolean)
            .join(' ');
    }
    if (typeof content === 'object') {
        return content.text || JSON.stringify(content);
    }
    return String(content);
}

/**
 * Extract snippet around matched query index
 * @param {string} text 
 * @param {number} index 
 * @param {number} matchLength 
 * @param {number} contextRadius 
 * @returns {string}
 */
function createSnippet(text, index, matchLength, contextRadius = 50) {
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(text.length, index + matchLength + contextRadius);
    let snippet = text.substring(start, end).replace(/[\r\n\t]+/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
}

/**
 * Deep search across all chat titles and message contents
 * @param {string} query - The search query
 * @returns {Array} List of matching chat metadata with snippet matches
 */
function searchChatsContent(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();
    const queryLength = trimmedQuery.length;
    const chatDir = getChatHistoryDir();
    const results = [];

    try {
        const files = fs.readdirSync(chatDir);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const filePath = path.join(chatDir, file);
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const chat = JSON.parse(data);

                const title = chat.title || '';
                const titleMatch = title.toLowerCase().includes(lowerQuery);
                const messageMatches = [];
                let totalMatches = titleMatch ? 1 : 0;

                const messages = Array.isArray(chat.messages) ? chat.messages : [];
                for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
                    const msg = messages[msgIdx];
                    const text = extractTextMessage(msg.content);
                    const lowerText = text.toLowerCase();
                    let searchPos = 0;
                    let msgMatchCount = 0;

                    while ((searchPos = lowerText.indexOf(lowerQuery, searchPos)) !== -1) {
                        totalMatches++;
                        msgMatchCount++;

                        // Only capture up to 2 snippets per message to keep payload compact
                        if (msgMatchCount <= 2 && messageMatches.length < 5) {
                            messageMatches.push({
                                messageIndex: msgIdx,
                                role: msg.role || 'user',
                                snippet: createSnippet(text, searchPos, queryLength, 55),
                                matchIndex: searchPos
                            });
                        }

                        searchPos += queryLength;
                    }
                }

                if (titleMatch || messageMatches.length > 0) {
                    results.push({
                        id: chat.id,
                        title: chat.title,
                        createdAt: chat.createdAt,
                        updatedAt: chat.updatedAt,
                        model: chat.model,
                        projectId: chat.projectId || null,
                        messageCount: messages.length,
                        matchCount: totalMatches,
                        titleMatch: titleMatch,
                        matches: messageMatches
                    });
                }
            } catch (err) {
                console.error(`Error searching chat file ${file}:`, err);
            }
        }

        // Sort by match count descending, then by updatedAt descending
        results.sort((a, b) => {
            if (b.matchCount !== a.matchCount) {
                return b.matchCount - a.matchCount;
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

    } catch (error) {
        console.error('Error during deep search across chats:', error);
    }

    return results;
}

/**
 * Delete all chats from disk
 * @returns {Object} Result object with success status and deleted count
 */
function deleteAllChats() {
    const chatDir = getChatHistoryDir();
    try {
        const files = fs.readdirSync(chatDir);
        let count = 0;
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(chatDir, file);
                try {
                    fs.unlinkSync(filePath);
                    count++;
                } catch (err) {
                    console.error(`Error deleting chat file ${file}:`, err);
                }
            }
        }
        return { success: true, count };
    } catch (error) {
        console.error('Error deleting all chats:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clear all messages from a specific chat
 * @param {string} chatId - The chat ID
 * @returns {Object|null} The updated chat object or null if not found
 */
function clearChatMessages(chatId) {
    const chat = loadChat(chatId);
    if (!chat) {
        console.error(`Chat ${chatId} not found`);
        return null;
    }

    chat.messages = [];
    saveChat(chat);
    return chat;
}

module.exports = {
    initialize,
    initializeChatHistoryHandlers,
    createChat,
    loadChat,
    saveChat,
    deleteChat,
    deleteAllChats,
    clearChatMessages,
    listChats,
    updateChatMessages,
    updateChatTitle,
    updateChatProject,
    unassignProjectFromChats,
    generateChatTitle,
    searchChatsContent
};


