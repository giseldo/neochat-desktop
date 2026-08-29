# Visão Geral da Arquitetura

O **NeoChat Desktop** é um ambiente de trabalho desktop de Inteligência Artificial de última geração, construído sob o paradigma **Local-First**, com suporte universal a múltiplos provedores de LLMs, ferramentas locais/remotas via **Model Context Protocol (MCP)**, base de conhecimento vetorial (**RAG**) e recursos de edição interativa em tempo real (**Canvas**).

---

## 🏛️ Filosofia de Engenharia e Princípios de Design

A arquitetura do NeoChat Desktop é guiada por quatro princípios fundamentais:

1. **Privacidade e Soberania dos Dados (Local-First):**
   - Histórico de conversas, credenciais, configurações e índices vetoriais de RAG residem exclusivamente na máquina do usuário.
   - Nenhuma telemetria ou dado de chat passa por servidores intermediários proprietários.

2. **Universalidade & Independência de Provedores:**
   - A camada de inferência é desacoplada de qualquer fornecedor de nuvem.
   - Alternância fluida entre APIs de alta velocidade (Groq, OpenAI, Anthropic, DeepSeek, Gemini) e motores locais 100% offline (Ollama, LM Studio).

3. **Extensibilidade Modular via Protocolos Abertos:**
   - Adoção integral do **Model Context Protocol (MCP)** da Anthropic para capacitar o modelo com acesso ao sistema de arquivos, bancos de dados, navegadores e APIs externas.

4. **Desempenho e Confiabilidade Extrema:**
   - Comunicação assíncrona orientada a eventos via IPC do Electron, com streaming push contínuo, eliminação de gargalos no thread de renderização e mitigação rigorosa de vazamentos de memória (HMR listeners cleanup).

---

## 🧩 Visão Estrutural Macro

O sistema é dividido em três camadas bem definidas:

```
+-------------------------------------------------------------------------------+
|                             SISTEMA OPERACIONAL                               |
|       (Windows / macOS / Linux - Filesystem, Keychain, Shell, Protocolos)     |
+-------------------------------------------------------------------------------+
                                      ▲
                                      │ Chamadas Nativas & stdio
                                      ▼
+-------------------------------------------------------------------------------+
|                       PROCESSO PRINCIPAL (ELECTRON MAIN)                      |
|                               (Node.js Runtime)                               |
|                                                                               |
|   +-------------------+  +-------------------+  +-------------------------+   |
|   |    chatHandler    |  |    mcpManager     |  |       ragService        |   |
|   |  (Streaming/Loop) |  |  (Stdio/SSE MCP)  |  | (Vector Search / Chunks)|   |
|   +-------------------+  +-------------------+  +-------------------------+   |
|                                                                               |
|   +-------------------+  +-------------------+  +-------------------------+   |
|   |  settingsManager  |  |    secretStore    |  |     canvasManager       |   |
|   |  & configDirMgr   |  | (safeStorage API) |  |   (Artifacts & TTS)     |   |
|   +-------------------+  +-------------------+  +-------------------------+   |
|                                                                               |
|   +-------------------+  +-------------------+  +-------------------------+   |
|   |  workflowManager  |  |  schedulerManager |  |  observabilityManager   |   |
|   +-------------------+  +-------------------+  +-------------------------+   |
+-------------------------------------------------------------------------------+
                                      ▲
                                      │ IPC Bridge Seguro (preload.js)
                                      │ contextIsolation: true, nodeIntegration: false
                                      ▼
+-------------------------------------------------------------------------------+
|                     PROCESSO DE RENDERIZAÇÃO (FRONTEND)                       |
|                          (Chromium / React 19 / Vite)                         |
|                                                                               |
|   +-------------------+  +-------------------+  +-------------------------+   |
|   |    Chat Window    |  |   Canvas Editor   |  |     Floating Popup      |   |
|   | (Markdown + KaTeX)|  |  (Monaco Editor)  |  |      (Quick Query)      |   |
|   +-------------------+  +-------------------+  +-------------------------+   |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |       State Management, Radix Primitives, Next-Themes, Lucide Icons   |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 🔄 Fluxo de Dados de Ponta a Ponta

Um ciclo típico de interação do usuário percorre as seguintes etapas:

1. **Entrada do Usuário:** O usuário envia uma mensagem na interface React 19 (com anexos opcionais, arquivos de RAG ou chamadas de ferramentas).
2. **Ponte IPC:** O componente de chat invoca `window.electron.startChatStream(params)`.
3. **Orquestração no Main:**
   - `chatHandler.js` resolve o provedor ativo (`shared/providers.js`) e recupera a chave de API de forma segura do `secretStore.js`.
   - O histórico de mensagens é podado e compactado de acordo com o context window do modelo (`messageUtils.js`).
   - Se RAG estiver habilitado, `ragService.js` recupera os fragmentos mais relevantes e os injeta no System Prompt.
   - O catálogo de ferramentas MCP ativas é montado e passado como `tools` na requisição.
4. **Streaming de Inferência:** A requisição SSE é aberta contra a API do provedor (ou Ollama local). Conforme os chunks chegam:
   - Tokens de pensamento (`<think>...</think>`) são extraídos e emitidos via evento `chat-think-chunk`.
   - Tokens de resposta são emitidos via evento `chat-chunk`.
5. **Execução de Ferramentas (Tool Loop):**
   - Se o modelo requisitar chamadas de ferramentas (`tool_calls`), o `chatHandler` valida as permissões com `toolPermissionManager`, delega para o `mcpManager` (que roda o script correspondente via stdio) e reinjeta o retorno no contexto do modelo para gerar a resposta final sintetizada.
6. **Renderização & Persistência:** O frontend renderiza Markdown em tempo real e, ao final, o diálogo é persistido atomicamente pelo `chatHistoryManager.js`.
