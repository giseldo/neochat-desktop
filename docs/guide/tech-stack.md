# Stack Tecnológica & Dependências

A seleção de tecnologias do NeoChat Desktop foi projetada para combinar alta fidelidade nativa, isolamento de segurança e experiência de desenvolvimento moderna.

---

## 🛠️ Matriz Tecnológica

| Camada | Tecnologia | Versão | Racional Arquitetural |
| :--- | :--- | :--- | :--- |
| **Runtime Desktop** | **Electron** | `37.0.0` | Acesso nativo a APIs de sistema (SafeStorage, Filesystem, Global Shortcuts, Systray, PTY) com Chromium 130+. |
| **Processo Main** | **Node.js (CommonJS)** | `>= 20` | Execução assíncrona robusta, suporte nativo a buffers, streams, child processes e criptografia de SO. |
| **Agent Runtime** | **Neo Agent Harness** | Integrado | Máquina de estados determinística (`agentLoop.js`), typed event bus, checkpoints transacionais e permissions engine. |
| **Frontend UI** | **React** | `19.0.3` | Renderização concorrente, transições otimizadas e ecossistema de componentes declarativos. |
| **Bundler / DevServer** | **Vite** | `6.2.6` | Hot Module Replacement (HMR) instantâneo e compilação otimizada para produção. |
| **Estilização** | **Tailwind CSS** | `3.3.3` | Sistema de design utility-first com suporte a temas dinâmicos (Dark/Light). |
| **Componentes Base** | **Radix UI** | `^2.x / ^1.x` | Primitivas de acessibilidade (Select, Slot, Dialog) sem estilo fixo. |
| **Editor de Código** | **Monaco Editor** | `^4.7.0` | O mesmo motor do VS Code para visualização e edição de código em tempo real no Canvas. |
| **Protocolo de Ferramentas** | **@modelcontextprotocol/sdk** | `^1.7.0` | SDK oficial da Anthropic para orquestração de servidores MCP via stdio, SSE e OAuth 2.0. |
| **Renderização Markdown** | **react-markdown + plugins** | `10.1.0` | Suporte a GitHub Flavored Markdown (`remark-gfm`), Matemática (`remark-math` + `rehype-katex` + `katex`). |
| **Parsing de Documentos** | **officeparser** | `^7.8.0` | Extração de texto de arquivos DOCX, XLSX, PPTX e PDFs para indexação no motor de RAG. |
| **Gerenciador de Pacotes** | **pnpm** | `10.9.0` | Gerenciamento determinístico de dependências com node-linker hoisted para o electron-builder. |
| **Empacotador Nativo** | **electron-builder** | `^24.13.3` | Geração de instaladores e binários executáveis para Windows, macOS e Linux. |

---

## 📦 Estrutura Completa de Diretórios

```
neochat-desktop/
├── electron/                         # Código do Processo Principal (CommonJS)
│   ├── main.js                       # Ponto de entrada, ciclo de vida e registro de IPCs
│   ├── preload.js                    # Ponte segura de isolamento de contexto (window.electron)
│   ├── agent/                        # Neo Agent Runtime (Harness Autônomo)
│   │   ├── index.js                  # Ponto de exportação do pacote do Agent
│   │   ├── runtime.js                # Facade central e orquestrador de AgentSession
│   │   ├── agentLoop.js              # Máquina de estados determinística e ReAct loop
│   │   ├── eventBus.js               # Barramento de eventos tipados (AGENT_EVENTS)
│   │   ├── modelRouter.js            # Roteamento inteligente de modelos e normalização
│   │   ├── toolRegistry.js           # Catálogo unificado de ferramentas nativas e MCP
│   │   ├── toolExecutor.js           # Executor seguro de ferramentas com sandboxing
│   │   ├── permissionEngine.js       # Políticas de autorização (ALLOW / PROMPT / DENY)
│   │   ├── checkpoints.js            # Snapshots de arquivos e rollback instantâneo
│   │   ├── shellManager.js           # Terminal persistente com isolamento de processos
│   │   ├── compactionManager.js      # Monitoramento de tokens e compactação preditiva
│   │   └── workspaceManager.js       # Inspeção e extração de contexto de repositórios
│   ├── chatHandler.js                # Motor de streaming de chat, tool loop e pruning
│   ├── chatHistoryManager.js         # Persistência atômica de histórico e Chat Branching
│   ├── projectManager.js             # Gerenciador de múltiplos projetos e workspaces
│   ├── mcpManager.js                 # Cliente MCP (stdio/SSE) e discovery de tools
│   ├── authManager.js                # OAuth 2.0 Dynamic Client Registration para MCP
│   ├── googleOAuthManager.js         # Autenticação Google OAuth
│   ├── gitManager.js                 # Integração nativa com Git local (status/diff/commit)
│   ├── codeRunner.js                 # Execução isolada de scripts Python e Node.js
│   ├── webSearchService.js           # Busca na Web em tempo real (Local/Tavily/Brave)
│   ├── screenCaptureService.js       # Captura de telas e janelas para modelos de visão
│   ├── ragService.js                 # Parsing de arquivos, chunking e busca vetorial
│   ├── backupManager.js              # Exportação/importação com sanitização de segredos
│   ├── secretStore.js                # Armazenamento seguro de chaves com safeStorage
│   ├── settingsManager.js            # Configurações do usuário e defaults
│   ├── canvasManager.js              # Artefatos do Monaco Editor e síntese TTS
│   ├── workflowManager.js            # Orquestrador de pipelines em etapas
│   ├── schedulerManager.js           # Agendador de tarefas periódicas em background
│   ├── observabilityManager.js       # Telemetria, tokens e custos
│   ├── popupWindow.js                # Janela flutuante rápida (Ctrl+G)
│   ├── updateManager.js              # Auto-atualização de releases
│   └── scripts/                      # Wrappers multiplataforma para servidores MCP
├── shared/                           # Código compartilhado entre Main e Renderer
│   ├── models.js                     # Registro e heurísticas de capacidades de modelos
│   ├── providers.js                  # Definições universais dos provedores de IA
│   └── ttsUtils.js                   # Utilitários para síntese de áudio
├── src/renderer/                     # Código do Processo de Renderização (React 19 / ESM)
│   ├── main.jsx                      # Ponto de montagem da aplicação React
│   ├── App.jsx                       # Componente raiz, roteamento e estado central
│   ├── components/                   # Componentes modulares (Agent, Chat, Canvas, Modals)
│   ├── context/                      # Provedores de contexto React (Chat, Project, Canvas)
│   └── index.css                     # Estilos globais e utilitários Tailwind
├── docs/                             # Documentação Técnica Oficial (VitePress)
├── electron-builder.yml              # Configuração de empacotamento para distribuição
├── package.json                      # Metadados do projeto e scripts
└── vercel.json                       # Configuração de deploy da documentação na Vercel
```
