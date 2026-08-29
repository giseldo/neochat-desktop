# Stack Tecnológica & Dependências

A seleção de tecnologias do NeoChat Desktop foi projetada para combinar alta fidelidade nativa, isolamento de segurança e experiência de desenvolvimento moderna.

---

## 🛠️ Matriz Tecnológica

| Camada | Tecnologia | Versão | Racional Arquitetural |
| :--- | :--- | :--- | :--- |
| **Runtime Desktop** | **Electron** | `37.0.0` | Acesso nativo a APIs de sistema (Keychain, Filesystem, Global Shortcuts, Systray) com Chromium moderno. |
| **Processo Main** | **Node.js (CommonJS)** | `>= 20` | Execução assíncrona robusta, suporte nativo a buffers, streams, stdio child processes e criptografia de SO. |
| **Frontend UI** | **React** | `19.0.3` | Renderização concorrente, transições otimizadas e ecossistema de componentes declarativos. |
| **Bundler / DevServer** | **Vite** | `6.2.6` | Hot Module Replacement (HMR) instantâneo e compilação otimizada para produção. |
| **Estilização** | **Tailwind CSS** | `3.3.3` | Sistema de design utility-first com suporte a temas dinâmicos (Dark/Light). |
| **Componentes Base** | **Radix UI** | `^2.x / ^1.x` | Primitivas de acessibilidade (Select, Slot, Dialog) sem estilo fixo. |
| **Editor de Código** | **Monaco Editor** | `^4.7.0` | O mesmo motor do VS Code para visualização e edição de código em tempo real no Canvas. |
| **Protocolo de Ferramentas** | **@modelcontextprotocol/sdk** | `^1.7.0` | SDK oficial da Anthropic para orquestração de servidores MCP via stdio e SSE. |
| **Renderização Markdown** | **react-markdown + plugins** | `10.1.0` | Suporte a GitHub Flavored Markdown (`remark-gfm`), Matemática (`remark-math` + `rehype-katex` + `katex`). |
| **Parsing de Documentos** | **officeparser** | `^7.8.0` | Extração de texto de arquivos DOCX, XLSX, PPTX e PDFs para indexação no motor de RAG. |
| **Gerenciador de Pacotes** | **pnpm** | `10.9.0` | Gerenciamento determinístico de dependências com node-linker hoisted para o electron-builder. |
| **Empacotador Nativo** | **electron-builder** | `^24.13.3` | Geração de instaladores e binários executáveis para Windows, macOS e Linux. |

---

## 📦 Estrutura de Diretórios do Projeto

```
neochat-desktop/
├── electron/                 # Código do Processo Principal (CommonJS)
│   ├── main.js               # Ponto de entrada, ciclo de vida e registro de IPCs
│   ├── preload.js            # Ponte de isolamento de contexto (window.electron)
│   ├── chatHandler.js        # Motor de streaming de chat, tool loop e pruning
│   ├── mcpManager.js         # Cliente MCP (stdio/SSE) e discovery de tools
│   ├── ragService.js         # Parsing de arquivos, chunking e busca vetorial
│   ├── settingsManager.js    # Gerenciamento de configurações do usuário
│   ├── secretStore.js        # Armazenamento seguro de API Keys com safeStorage
│   ├── canvasManager.js      # Gerenciamento de artefatos e texto-para-fala (TTS)
│   ├── workflowManager.js    # Orquestrador de fluxos automatizados em etapas
│   ├── schedulerManager.js   # Agendador de tarefas periódicas em background
│   ├── observabilityManager.js# Telemetria, tokens e custos
│   ├── gitManager.js         # Integração com repositórios Git locais
│   ├── codeRunner.js         # Execução isolada de scripts (Node/Python)
│   └── scripts/              # Wrappers multiplataforma para servidores MCP
├── shared/                   # Código compartilhado entre Main e Renderer
│   ├── models.js             # Registro e heurísticas de capacidades de modelos
│   ├── providers.js          # Definições universais dos provedores de IA
│   └── ttsUtils.js           # Utilitários para síntese de áudio
├── src/renderer/             # Código do Processo de Renderização (React 19 / ESM)
│   ├── main.jsx              # Ponto de montagem da aplicação React
│   ├── App.jsx               # Componente raiz, roteamento e estado central
│   ├── components/           # Componentes modulares de UI (Chat, Canvas, Settings, etc.)
│   ├── context/              # Provedores de contexto React (Theme, Providers, MCP)
│   └── index.css             # Estilos globais e utilitários Tailwind
├── docs/                     # Documentação Técnica Oficial (VitePress)
├── electron-builder.yml      # Configuração de empacotamento para distribuição
├── package.json              # Metadados do projeto e scripts
└── vercel.json               # Configuração de deploy da documentação na Vercel
```
