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

O sistema é dividido em camadas modulares com fronteiras de segurança rigorosas:

```
+-----------------------------------------------------------------------------------------------+
|                                      SISTEMA OPERACIONAL                                      |
|    (Windows / macOS / Linux - Filesystem, SafeStorage DPAPI/Keychain, Shell PTY, Git, Rede)   |
+-----------------------------------------------------------------------------------------------+
                                               ▲
                                               │ Chamadas de Sistema, stdio & Processos
                                               ▼
+-----------------------------------------------------------------------------------------------+
|                              PROCESSO PRINCIPAL (ELECTRON MAIN)                               |
|                                       (Node.js Runtime)                                       |
|                                                                                               |
|   +---------------------------------------------------------------------------------------+   |
|   |                        NEO AGENT RUNTIME (electron/agent/)                            |   |
|   |   • agentLoop (State Machine)     • modelRouter (Multi-LLM)   • toolRegistry/Executor |   |
|   |   • permissionEngine              • checkpoints (Undo/Roll)   • shellManager (PTY)    |   |
|   |   • compactionManager             • workspaceManager          • eventBus (Typed)      |   |
|   +---------------------------------------------------------------------------------------+   |
|                                                                                               |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|   |    chatHandler    |  |    mcpManager     |  |     ragService     |  |  projectManager |   |
|   |  (Chat Streaming) |  | (Stdio/SSE MCP)   |  | (Embeddings/Chunks)|  | (Workspaces)    |   |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|                                                                                               |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|   |    gitManager     |  |    codeRunner     |  |  webSearchService  |  |  screenCapture  |   |
|   |  (Git Status/Diff)|  | (Python / Node)   |  | (Bing/Tavily/Brave)|  | (Window/Screen) |   |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|                                                                                               |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|   |  settingsManager  |  |    secretStore    |  |   backupManager    |  |  canvasManager  |   |
|   |  & configDirMgr   |  | (safeStorage API) |  | (Export / Recovery)|  | (Monaco / TTS)  |   |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|                                                                                               |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|   |  workflowManager  |  |  schedulerManager |  |  systemMonitor     |  |  authManager    |   |
|   |  (Automations)    |  | (Cron Background) |  | (Hardware Stats)   |  | (OAuth 2.0 MCP) |   |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
+-----------------------------------------------------------------------------------------------+
                                               ▲
                                               │ IPC Bridge Seguro (preload.js)
                                               │ contextIsolation: true, nodeIntegration: false
                                               ▼
+-----------------------------------------------------------------------------------------------+
|                             PROCESSO DE RENDERIZAÇÃO (FRONTEND)                               |
|                                  (Chromium / React 19 / Vite)                                 |
|                                                                                               |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|   |    Chat Stream    |  |   Agent Harness   |  |   Canvas Editor    |  |   Quick Popup   |   |
|   | (Markdown/KaTeX)  |  | (Trajectory Ledger|  |  (Monaco Editor +  |  | (Spotlight Ctrl |   |
|   | & Branching Tree  |  |  & Approvals)     |  |   Live Preview)    |  |  + G Shortcut)  |   |
|   +-------------------+  +-------------------+  +--------------------+  +-----------------+   |
|                                                                                               |
|   +---------------------------------------------------------------------------------------+   |
|   |         State Contexts, Radix Primitives, Tailwind CSS, Lucide Icons, I18n Engine     |   |
|   +---------------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------------+
```

---

## 🔄 Fluxos de Execução

O NeoChat opera em dois modos primários de interação:

### 1. Modo Conversacional (Chat Stream)
1. **Disparo:** O usuário submete a mensagem na interface React 19.
2. **Ponte IPC:** Invocação de `window.electron.startChatStream(params)`.
3. **Resolução de Contexto:** O `chatHandler.js` recupera credenciais seguras do `secretStore.js`, anexa fragmentos do `ragService` e monta o histórico podado com `messageUtils.js`.
4. **Streaming Contínuo:** Chunks de raciocínio (`<think>`) e conteúdo são emitidos em tempo real para a interface.
5. **Persistência Atômica:** A conversa é salva pelo `chatHistoryManager.js` com suporte a ramificação em árvore (Chat Branching).

### 2. Modo Agente Autônomo (Neo Agent Runtime)
1. **Inicialização de Sessão:** `neoAgentRuntime.createSession({ workspaceRoot, model })` cria uma sessão com barramento tipado (`AgentEventBus`).
2. **Ciclo ReAct & State Machine:** O `agentLoop.js` transita entre `THINKING` $\rightarrow$ `TOOL_REQUEST` $\rightarrow$ `TOOL_EXECUTION` $\rightarrow$ `OBSERVING`.
3. **Avaliação de Segurança:** O `permissionEngine.js` valida se a ferramenta é somente leitura (auto-permitida) ou mutante (exibe `ToolApprovalModal` ao usuário).
4. **Snapshots de Checkpoint:** O `checkpointsManager.js` registra o estado do arquivo antes da edição, permitindo reversão (`rollback`) a qualquer momento.
5. **Auditoria de Trajetória:** Cada passo, raciocínio e diff de arquivo é registrado no `TrajectoryLedger` e desenhado no `TrajectoryTimeline`.
