# Motor Multi-Provider & Streaming

O NeoChat Desktop foi arquitetado para ser completamente agnóstico em relação ao fornecedor de inteligência artificial, oferecendo uma camada de orquestração universal no módulo `shared/providers.js` e `electron/chatHandler.js`.

---

## 🌐 Provedores de IA Suportados

A aplicação conecta-se de forma nativa e padronizada aos seguintes ecossistemas:

| Provedor | Tipo | Modo de Conexão | Suporte a Ferramentas (MCP) | Suporte a Visão |
| :--- | :--- | :--- | :---: | :---: |
| **Groq** | Nuvem Ultra-Rápida | API REST / SSE | Sim | Sim (Llama 3.2 Vision) |
| **OpenAI** | Nuvem Proprietária | API REST / SSE | Sim | Sim (GPT-4o / GPT-4.5) |
| **Anthropic** | Nuvem Proprietária | API REST / SSE | Sim | Sim (Claude 3.5 / 3.7 Sonnet) |
| **DeepSeek** | Nuvem / Raciocínio | API REST / SSE | Sim | Não |
| **Google Gemini** | Nuvem Proprietária | API REST / SSE | Sim | Sim (Gemini 2.5 Pro / Flash) |
| **Ollama** | Local / Offline | HTTP Local (`:11434`) | Sim (Modelos compatíveis) | Sim (LLaVA / Minicpm) |
| **LM Studio** | Local / Offline | HTTP Local (`:1234`) | Sim | Conforme modelo |
| **Mistral AI** | Nuvem | API REST / SSE | Sim | Sim (Pixtral) |
| **OpenRouter** | Agregador Universal | API REST / SSE | Sim | Sim |
| **Custom Endpoint**| Privado / Corporativo | OpenAI-compatible API | Sim | Configurável |

---

## 🔍 Descoberta Dinâmica de Modelos & Heurísticas

Em vez de listas estáticas de modelos hardcoded, o NeoChat interroga os endpoints de catálogo de cada provedor em tempo de execução, aplicando um cache inteligente de 5 minutos:

```javascript
// shared/models.js - Heurística de Capacidades por Nomenclatura
export function inferModelCapabilities(modelId) {
  const lower = modelId.toLowerCase();
  return {
    supportsTools: /gpt-|claude-|llama-3.[1-9]|qwen-2.5|gemini|mistral|deepseek/.test(lower),
    supportsVision: /vision|llava|pixtral|gpt-4o|claude-3|gemini|llama-3.2-(11b|90b)/.test(lower),
    supportsReasoning: /r1|qwq|o1|o3|reasoner|thinking/.test(lower),
    contextWindow: resolveContextSize(lower)
  };
}
```

---

## 🔀 Roteamento Inteligente & ModelRouter (`electron/agent/modelRouter.js`)

No Neo Agent Runtime, o `ModelRouter` atua como a ponte unificada de inferência:
- **Normalização de Parâmetros:** Adapta automaticamente formatos de `tools`, `temperature`, `max_tokens` e `response_format` para as especificidades de cada SDK/provedor.
- **Transmissão Bidirecional de Streams:** Emite separadamente tokens de pensamento (`onReasoning`) e de conteúdo (`onToken`), permitindo que a interface anime o bloco de raciocínio em tempo real.
- **Mecanismo de Auto-Recuperação:** Se uma chamada de ferramenta falhar por formatação de JSON do modelo, o roteador gera um aviso estruturado no turno seguinte para auto-correção do LLM.

---

## ✂️ Gerenciamento Inteligente de Context Window (`compactionManager.js` & `messageUtils.js`)

Para prevenir erros de `context_length_exceeded` sem perder o fio da meada:

```
Orçamento Total de Tokens do Modelo (Ex: 128.000 / 200.000)
┌─────────────────────────────────────────────────────────────────────────────┐
│ [System Prompt + Regras de Workspace] (Prioridade Alta - Sempre Preservado) │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Resumo Compactado de Turnos Anteriores] (Gerado pelo CompactionManager)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Últimas Interações do Agente / Chat] (Prioridade Máxima - Fiel e Completo) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Fallback Automático entre Provedores

Caso a requisição para o provedor primário falhe por instabilidade na rede ou rate limit (`HTTP 429`), o sistema ativa transparentemente o provedor secundário configurado pelo usuário, mantendo a sessão de trabalho sem interrupções.
