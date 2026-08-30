import { PROVIDERS } from '@/lib/providers';

export const runtime = 'nodejs'; // ou 'edge'

export async function POST(req) {
  try {
    const { messages, provider = 'groq', model, systemPrompt, apiKey: bodyKey, temperature = 0.7 } = await req.json();

    // Prioridade da chave: Header customizado > Body da requisição > Variável de ambiente (Fallback de demonstração)
    const headerKey = req.headers.get('x-api-key');
    const envKeyName = `${provider.toUpperCase()}_API_KEY`;
    const apiKey = headerKey || bodyKey || process.env[envKeyName] || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: `Chave de API (BYOK) não fornecida para o provedor ${provider.toUpperCase()}. Configure sua chave no painel de configurações.`,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const providerConfig = PROVIDERS[provider] || PROVIDERS.groq;
    const selectedModel = model || providerConfig.defaultModel;

    // Formata o histórico com o System Prompt se fornecido
    const formattedMessages = [];
    if (systemPrompt && systemPrompt.trim()) {
      formattedMessages.push({ role: 'system', content: systemPrompt.trim() });
    }
    for (const msg of messages) {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }

    // Se for Anthropic direto
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 4096,
          system: systemPrompt || undefined,
          messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erro Anthropic (${response.status}): ${errText}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Stream transform para SSE padrão
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const data = JSON.parse(dataStr);
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.delta.text })}\n\n`));
                  }
                } catch (e) {
                  // ignore json parse error
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Provedores padrão OpenAI-compatíveis (Groq, OpenAI, Gemini OpenAI endpoint, DeepSeek, Mistral, OpenRouter)
    let endpoint = `${providerConfig.baseUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedMessages,
        temperature: parseFloat(temperature) || 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Erro ${providerConfig.name} (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta;
                const content = delta?.content || '';
                const reasoning = delta?.reasoning_content || '';
                
                if (content || reasoning) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, reasoning })}\n\n`));
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro na API de Chat:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
