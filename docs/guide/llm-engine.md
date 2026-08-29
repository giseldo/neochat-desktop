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

## ✂️ Gerenciamento Inteligente de Context Window (`messageUtils.js`)

Para evitar falhas por estouro de limite de tokens (`context_length_exceeded`), o `chatHandler` aplica um algoritmo de poda proporcional:

```
Orçamento Total de Tokens do Modelo (Ex: 128.000)
┌─────────────────────────────────────────────────────────────────────────────┐
│ [System Prompt + RAG Context]  (Prioridade Alta - Sempre Preservado)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Mensagens Históricas Podadas] (Compactadas conforme o limite restante)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Últimas Interações do Chat]  (Prioridade Máxima - Integridade Garantida)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Fallback Automático entre Provedores

Caso a requisição para o provedor primário falhe por instabilidade na rede ou rate limit (`HTTP 429`), o sistema ativa transparentemente o provedor secundário configurado pelo usuário, mantendo a sessão de chat sem interrupções.
