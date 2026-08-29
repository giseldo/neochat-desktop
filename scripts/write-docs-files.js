const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '..', 'docs');
const guideDir = path.join(docsDir, 'guide');

if (!fs.existsSync(guideDir)) {
  fs.mkdirSync(guideDir, { recursive: true });
}

const files = {};

// 1. index.md
files['index.md'] = `---
layout: home

hero:
  name: "NeoChat Desktop"
  text: "Arquitetura & Engenharia"
  tagline: "Documentação técnica aprofundada do ecossistema desktop de IA universal, local-first, construído com Electron 37, React 19 e Model Context Protocol (MCP)."
  actions:
    - theme: brand
      text: 🚀 Explorar Arquitetura
      link: /guide/overview
    - theme: alt
      text: 🧩 Model Context Protocol
      link: /guide/mcp
    - theme: alt
      text: 📦 Repositório GitHub
      link: https://github.com/giseldo/neochat-desktop

features:
  - icon: 🌐
    title: Multi-Provider Universal
    details: Suporte unificado para Groq, OpenAI, Anthropic, DeepSeek, Google Gemini, Ollama, LM Studio, Mistral e endpoints customizados com streaming em tempo real e fallback resiliente.
  - icon: 🔌
    title: Model Context Protocol (MCP)
    details: Integração nativa com a especificação aberta MCP da Anthropic, orquestrando servidores locais (stdio) e remotos (SSE) com scripts multiplataforma.
  - icon: 📚
    title: RAG Local & Busca Vetorial
    details: Base de conhecimento 100% offline com parsing de PDF, DOCX, XLSX e Markdown, chunking semântico e busca por similaridade de cossenos.
  - icon: 🛡️
    title: Segurança & Zero-Trust Local
    details: Isolamento rigoroso de contexto (Preload Bridge), credenciais protegidas via safeStorage (Keychain/DPAPI) e sandbox para execução de ferramentas.
  - icon: ⚡
    title: Frontend Moderno em React 19
    details: Renderização de alta performance com suporte a KaTeX (matemática), realce de sintaxe, Canvas com Monaco Editor, TTS e chat branching.
  - icon: ⏱️
    title: Automações, Workflows & Scheduler
    details: Orquestrador de tarefas em segundo plano com agendamento estilo cron, pipelines encadeados de prompts e telemetria de consumo de tokens.
---

<div class="tip custom-block" style="margin-top: 2rem;">
  <p class="custom-block-title">💡 Sobre esta Documentação</p>
  <p>
    Esta documentação foi projetada para engenheiros de software, arquitetos e contribuidores que desejam entender os detalhes internos de implementação, padrões de comunicação IPC, segurança e fluxo de dados do <b>NeoChat Desktop</b>.
  </p>
</div>
`;

// 2. overview.md
files['guide/overview.md'] = `# Visão Geral da Arquitetura

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

\`\`\`
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
\`\`\`

---

## 🔄 Fluxo de Dados de Ponta a Ponta

Um ciclo típico de interação do usuário percorre as seguintes etapas:

1. **Entrada do Usuário:** O usuário envia uma mensagem na interface React 19 (com anexos opcionais, arquivos de RAG ou chamadas de ferramentas).
2. **Ponte IPC:** O componente de chat invoca \`window.electron.startChatStream(params)\`.
3. **Orquestração no Main:**
   - \`chatHandler.js\` resolve o provedor ativo (\`shared/providers.js\`) e recupera a chave de API de forma segura do \`secretStore.js\`.
   - O histórico de mensagens é podado e compactado de acordo com o context window do modelo (\`messageUtils.js\`).
   - Se RAG estiver habilitado, \`ragService.js\` recupera os fragmentos mais relevantes e os injeta no System Prompt.
   - O catálogo de ferramentas MCP ativas é montado e passado como \`tools\` na requisição.
4. **Streaming de Inferência:** A requisição SSE é aberta contra a API do provedor (ou Ollama local). Conforme os chunks chegam:
   - Tokens de pensamento (\`<think>...</think>\`) são extraídos e emitidos via evento \`chat-think-chunk\`.
   - Tokens de resposta são emitidos via evento \`chat-chunk\`.
5. **Execução de Ferramentas (Tool Loop):**
   - Se o modelo requisitar chamadas de ferramentas (\`tool_calls\`), o \`chatHandler\` valida as permissões com \`toolPermissionManager\`, delega para o \`mcpManager\` (que roda o script correspondente via stdio) e reinjeta o retorno no contexto do modelo para gerar a resposta final sintetizada.
6. **Renderização & Persistência:** O frontend renderiza Markdown em tempo real e, ao final, o diálogo é persistido atomicamente pelo \`chatHistoryManager.js\`.
`;

// 3. tech-stack.md
files['guide/tech-stack.md'] = `# Stack Tecnológica & Dependências

A seleção de tecnologias do NeoChat Desktop foi projetada para combinar alta fidelidade nativa, isolamento de segurança e experiência de desenvolvimento moderna.

---

## 🛠️ Matriz Tecnológica

| Camada | Tecnologia | Versão | Racional Arquitetural |
| :--- | :--- | :--- | :--- |
| **Runtime Desktop** | **Electron** | \`37.0.0\` | Acesso nativo a APIs de sistema (Keychain, Filesystem, Global Shortcuts, Systray) com Chromium moderno. |
| **Processo Main** | **Node.js (CommonJS)** | \`>= 20\` | Execução assíncrona robusta, suporte nativo a buffers, streams, stdio child processes e criptografia de SO. |
| **Frontend UI** | **React** | \`19.0.3\` | Renderização concorrente, transições otimizadas e ecossistema de componentes declarativos. |
| **Bundler / DevServer** | **Vite** | \`6.2.6\` | Hot Module Replacement (HMR) instantâneo e compilação otimizada para produção. |
| **Estilização** | **Tailwind CSS** | \`3.3.3\` | Sistema de design utility-first com suporte a temas dinâmicos (Dark/Light). |
| **Componentes Base** | **Radix UI** | \`^2.x / ^1.x\` | Primitivas de acessibilidade (Select, Slot, Dialog) sem estilo fixo. |
| **Editor de Código** | **Monaco Editor** | \`^4.7.0\` | O mesmo motor do VS Code para visualização e edição de código em tempo real no Canvas. |
| **Protocolo de Ferramentas** | **@modelcontextprotocol/sdk** | \`^1.7.0\` | SDK oficial da Anthropic para orquestração de servidores MCP via stdio e SSE. |
| **Renderização Markdown** | **react-markdown + plugins** | \`10.1.0\` | Suporte a GitHub Flavored Markdown (\`remark-gfm\`), Matemática (\`remark-math\` + \`rehype-katex\` + \`katex\`). |
| **Parsing de Documentos** | **officeparser** | \`^7.8.0\` | Extração de texto de arquivos DOCX, XLSX, PPTX e PDFs para indexação no motor de RAG. |
| **Gerenciador de Pacotes** | **pnpm** | \`10.9.0\` | Gerenciamento determinístico de dependências com node-linker hoisted para o electron-builder. |
| **Empacotador Nativo** | **electron-builder** | \`^24.13.3\` | Geração de instaladores e binários executáveis para Windows, macOS e Linux. |

---

## 📦 Estrutura de Diretórios do Projeto

\`\`\`
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
\`\`\`
`;

// 4. main-process.md
files['guide/main-process.md'] = `# Arquitetura do Processo Principal (Electron Main)

O Processo Principal é o coração do NeoChat Desktop. Ele roda diretamente sobre o ambiente Node.js com privilégios completos de sistema, sendo responsável pelo ciclo de vida da aplicação, gerenciamento de janelas, comunicação com APIs externas, execução de servidores MCP e persistência de dados.

---

## 🏁 Inicialização & Bootstrap

O arquivo \`electron/main.js\` realiza a inicialização em ordem estrita de dependências:

\`\`\`
+--------------------------------------------------------------+
| 1. configDirManager.bootstrapUserDataPath(app)               |
|    Define diretório customizado de dados antes de tudo       |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| 2. Inicialização do Logger Unificado                         |
|    Espelhamento de console.* para logs/main.log              |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| 3. Single Instance Lock (app.requestSingleInstanceLock)      |
|    Garante instância única e repassa parâmetros/URLs         |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| 4. Registro de Protocolos de URL & Atalhos Globais           |
|    Tratamento de esquemas groq:// e atalho Ctrl+G / Cmd+G   |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| 5. Inicialização dos Managers e Handlers de IPC              |
|    settings, mcp, chat, rag, canvas, secretStore, etc.       |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| 6. Criação da Janela Principal (BrowserWindow)               |
|    Carregamento do Vite DevServer ou dist/index.html         |
+--------------------------------------------------------------+
\`\`\`

---

## 🗂️ Mapeamento dos Managers Especializados

Para evitar o anti-padrão de um arquivo \`main.js\` monolítico, as responsabilidades são estritamente particionadas em módulos especialistas:

### 1. \`chatHandler.js\`
- **Responsabilidade:** Motor central de execução de conversas.
- **Funções:**
  - Montagem de mensagens e injeção de System Prompts dinâmicos.
  - Streaming push via \`webContents.send('chat-chunk', ...)\`.
  - Extração e emissão de raciocínio (\`<think>\`).
  - Execução de tool calls do modelo em loop recursivo com servidores MCP.
  - Poda e compressão de histórico usando \`messageUtils.js\`.

### 2. \`mcpManager.js\`
- **Responsabilidade:** Gerenciador do ciclo de vida do **Model Context Protocol**.
- **Funções:**
  - Inicialização de processos filhos (stdio) utilizando wrappers de ambiente (\`electron/scripts/run-*.cmd|.ps1|.sh\`).
  - Conexão com servidores MCP remotos via Server-Sent Events (SSE).
  - Descoberta dinâmica de ferramentas (\`tools/list\`), recursos (\`resources/list\`) e prompts (\`prompts/list\`).
  - Normalização dos esquemas de parâmetros JSON Schema para os formatos esperados pelos provedores de LLM.

### 3. \`ragService.js\`
- **Responsabilidade:** Mecanismo de **Retrieval-Augmented Generation** local.
- **Funções:**
  - Leitura e extração de texto em formatos binários e estruturados via \`officeparser\`.
  - Quebra semântica em chunks com sobreposição de janelas.
  - Vetorização e cálculo de similaridade de cossenos no espaço de embeddings.
  - Indexação incremental baseada no hash de modificação dos arquivos.

### 4. \`settingsManager.js\` & \`secretStore.js\`
- **Responsabilidade:** Persistência de configurações e armazenamento criptográfico de credenciais.
- **Funções:**
  - Armazenamento em \`userData/settings.json\` com mesclagem atômica de padrões.
  - Encriptação de chaves de API em repouso através da API \`safeStorage\` nativa do Electron (Windows DPAPI, macOS Keychain, Linux Secret Service).

### 5. \`canvasManager.js\`
- **Responsabilidade:** Gerenciador de artefatos de trabalho e síntese de voz.
- **Funções:**
  - Salvamento, versionamento e exportação de códigos e documentos editados no Canvas.
  - Integração com utilitários de síntese de áudio (TTS) para leitura de artefatos.

### 6. \`workflowManager.js\` & \`schedulerManager.js\`
- **Responsabilidade:** Automação de pipelines de prompts e agendamentos.
- **Funções:**
  - Execução encadeada de passos com substituição de variáveis contextuais.
  - Execução em segundo plano de tarefas programadas (estilo cron) com notificações de sistema.

### 7. \`popupWindow.js\` & \`contextCapture.js\`
- **Responsabilidade:** Interface de acesso rápido global.
- **Funções:**
  - Exibição de uma janela flutuante sem bordas disparada por \`Ctrl+G\` (ou \`Cmd+G\`).
  - Captura inteligente do conteúdo do clipboard ou texto selecionado em outros aplicativos para consulta imediata de IA.

---

## 🌐 Deep Linking & Integração com o SO

O NeoChat registra esquemas de protocolo de URL customizados (\`groq://\` e \`neochat://\`):

\`\`\`javascript
// Exemplo de URL de contexto:
// groq://context?text=Analise%20este%20codigo&title=QueryRapida&source=VSCode

function handleUrlProtocol(url) {
  if (!url.startsWith('groq://')) return null;
  const urlObj = new URL(url);
  if (urlObj.pathname === '/context') {
    return {
      text: decodeURIComponent(urlObj.searchParams.get('text') || ''),
      title: decodeURIComponent(urlObj.searchParams.get('title') || ''),
      source: decodeURIComponent(urlObj.searchParams.get('source') || '')
    };
  }
}
\`\`\`
`;

// 5. ipc-security.md
files['guide/ipc-security.md'] = `# Ponte IPC & Modelo de Segurança

A segurança é um pilar não-negociável no NeoChat Desktop. Por se tratar de um aplicativo de inteligência artificial com capacidade de executar comandos e integrar-se a serviços externos, a barreira entre o processo de renderização e o processo principal é estritamente isolada.

---

## 🛡️ Princípios de Isolamento e Zero-Trust

O NeoChat adota as melhores práticas de segurança recomendadas pelo time do Electron:

\`\`\`javascript
// electron/windowManager.js
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    contextIsolation: true,       // ISOLAMENTO OBRIGATÓRIO DE CONTEXTO
    nodeIntegration: false,        // NENHUM ACESSO DIRETO A NODE.JS NO RENDERER
    sandbox: false,                // Sandboxing cooperativo
    preload: path.join(__dirname, 'preload.js')
  }
});
\`\`\`

- **\`contextIsolation: true\`**: O código JavaScript em execução no frontend (React) roda em um contexto de execução completamente isolado dos scripts internos do Electron.
- **\`nodeIntegration: false\`**: O frontend não pode executar \`require('fs')\`, \`require('child_process')\` ou qualquer outra API do Node.js diretamente.

---

## 🌉 A Ponte Segura: \`electron/preload.js\`

A única forma de comunicação entre a interface gráfica e o sistema operacional é através do objeto global congelado e controlado \`window.electron\`, exposto via \`contextBridge\`:

\`\`\`javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Chamadas Request / Response seguras
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getMcpServers: () => ipcRenderer.invoke('mcp-get-servers'),
  
  // Streaming de Chat Push com proteção contra Memory Leaks
  startChatStream: (params) => {
    // Garante que listeners anteriores não sejam duplicados em Hot Reload
    cleanupListeners();
    return ipcRenderer.invoke('start-chat-stream', params);
  },
  
  onChatChunk: (callback) => {
    const handler = (event, chunk) => callback(chunk);
    ipcRenderer.on('chat-chunk', handler);
    return () => ipcRenderer.removeListener('chat-chunk', handler);
  },
  
  onChatThinkChunk: (callback) => {
    const handler = (event, chunk) => callback(chunk);
    ipcRenderer.on('chat-think-chunk', handler);
    return () => ipcRenderer.removeListener('chat-think-chunk', handler);
  },
  
  // Armazenamento Seguro de Segredos
  setSecureSecret: (key, value) => ipcRenderer.invoke('secret-set', { key, value }),
  getSecureSecret: (key) => ipcRenderer.invoke('secret-get', { key })
});
\`\`\`

---

## 🔒 Proteção Criptográfica de Credenciais (\`secretStore.js\`)

Chaves de API (OpenAI, Anthropic, Groq, Gemini) nunca são armazenadas em texto simples no arquivo de configurações. Elas passam pelo módulo \`secretStore.js\`, que utiliza a API \`safeStorage\` nativa do Electron:

\`\`\`
+-----------------------+      safeStorage.encryptString(key)     +---------------------------+
| Chave em Texto Claro  | ───────────────────────────────────────> | Buffer Encriptado pelo SO |
| (Ex: gsk_xxxxxxx)     |                                         | (DPAPI / Keychain)        |
+-----------------------+                                         +---------------------------+
                                                                                │
                                                                                ▼
                                                                  Persistido em userData/
\`\`\`

- No **Windows**: A criptografia utiliza a API nativa **DPAPI** (Data Protection API) vinculada à conta do usuário do Windows.
- No **macOS**: As credenciais são seladas utilizando a chave mestra do **Apple Keychain**.
- No **Linux**: É utilizado o **libsecret** / Secret Service API do desktop environment.

---

## 🚦 Sistema de Permissões Granular de Ferramentas

Para evitar que ferramentas do Model Context Protocol (como exclusão de arquivos, comandos de terminal ou requisições de rede) sejam disparadas sem consentimento, o \`toolPermissionManager.js\` implementa políticas de aprovação:

1. **Auto-Permitir (Read-Only):** Ferramentas estritamente de leitura podem ser pré-autorizadas pelo usuário.
2. **Confirmação Explícita (Destructive / Write):** Chamadas com efeito colateral emitem um evento para a interface solicitando confirmação do usuário antes da execução no processo filho.
`;

// 6. renderer.md
files['guide/renderer.md'] = `# Frontend & Interface do Usuário (React 19)

O processo de renderização do NeoChat Desktop foi projetado para oferecer uma experiência de usuário rica, fluida e com resposta instantânea, aproveitando as inovações de concorrência do **React 19** e o design responsivo do **Tailwind CSS**.

---

## 🧱 Arquitetura de Componentes

A interface é modular e organizada hierarquicamente:

\`\`\`
src/renderer/
├── main.jsx                  # Ponto de montagem React DOM (React 19 createRoot)
├── App.jsx                   # Roteador de Modos, Gerenciamento de Estado Central
├── components/
│   ├── Chat/
│   │   ├── ChatArea.jsx      # Feed de mensagens com scroll virtualizado
│   │   ├── ChatInput.jsx     # Caixa de entrada com upload, prompts e seletor de modelos
│   │   ├── MessageItem.jsx   # Balão de mensagem com renderização de Markdown e Math
│   │   ├── ReasoningBlock.jsx# Bloco expansível animado para tokens <think>
│   │   └── ToolCallView.jsx  # Card interativo de execução de ferramentas MCP
│   ├── Canvas/
│   │   ├── CanvasEditor.jsx  # Editor Monaco com syntax highlighting multi-linguagem
│   │   ├── CanvasPreview.jsx # Visualizador em tempo real (HTML, Markdown, SVG)
│   │   └── CanvasTTS.jsx     # Controles de reprodução de voz e síntese de texto
│   ├── Sidebar/
│   │   ├── HistoryList.jsx   # Lista de conversas anteriores com busca e agrupamento
│   │   ├── ProjectTree.jsx   # Gestão de pastas e contextos de projeto
│   │   └── ModelSelector.jsx # Seletor dinâmico com badges de capacidades
│   └── Settings/
│       ├── ProvidersTab.jsx  # Configuração de chaves e endpoints de IA
│       ├── McpServersTab.jsx # Painel de instalação e status de servidores MCP
│       └── RagTab.jsx        # Gestor de documentos da base de conhecimento
\`\`\`

---

## 📐 Pipeline de Renderização de Markdown & Fórmulas

O NeoChat possui um pipeline completo de transformação de texto em elementos visuais ricos:

\`\`\`
[Texto Cru do LLM]
        │
        ▼
<ReactMarkdown>
  ├── remarkPlugins: [remarkGfm, remarkMath]
  └── rehypePlugins: [rehypeKatex]
        │
        ├── 🔹 Tabelas e Checklists (GitHub Flavored Markdown)
        ├── 🔹 Fórmulas Matemáticas em KaTeX ($E = mc^2$)
        ├── 🔹 Blocos de Código com ReactSyntaxHighlighter (Temas VS Code Dark/Light)
        └── 🔹 Ações Rápidas: Botão de Cópia, Download de Trecho e Envio para o Canvas
\`\`\`

---

## 💡 Extração & Renderização de Raciocínio (\`<think>\`)

Modelos como **DeepSeek R1**, **QwQ** e variantes de raciocínio emitem tags especiais de reflexão interna. O NeoChat trata esses dados de forma elegante:

1. O \`chatHandler.js\` identifica o fluxo de pensamento em tempo real.
2. Emite eventos dedicados \`chat-think-chunk\`.
3. O componente \`ReasoningBlock.jsx\` renderiza um bloco retrátil com animação de pulso e cronômetro de tempo de pensamento:

\`\`\`jsx
// Renderização do Bloco de Raciocínio
<div className="border-l-2 border-indigo-500/50 bg-indigo-50/5 dark:bg-indigo-950/20 p-3 rounded-r-lg mb-3">
  <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
    <BrainIcon className="w-3.5 h-3.5 animate-pulse" />
    <span>Processo de Raciocínio ({thinkingDuration}s)</span>
    <ChevronDownIcon className={clsx("w-3 h-3 transition-transform", expanded && "rotate-180")} />
  </button>
  {expanded && (
    <div className="mt-2 text-xs text-zinc-400 font-mono whitespace-pre-wrap">
      {thoughtContent}
    </div>
  )}
</div>
\`\`\`

---

## 🌿 Chat Branching (Árvore de Conversas)

Diferente de chats lineares convencionais, o NeoChat suporta **bifurcação de diálogos**:
- O usuário pode editar qualquer mensagem anterior no histórico.
- O sistema cria um novo nó filho na árvore de conversa sem sobrescrever a ramificação original.
- Navegadores de versão \`< 1 / 3 >\` permitem alternar entre diferentes linhas temporais da mesma conversa.
`;

// 7. llm-engine.md
files['guide/llm-engine.md'] = `# Motor Multi-Provider & Streaming

O NeoChat Desktop foi arquitetado para ser completamente agnóstico em relação ao fornecedor de inteligência artificial, oferecendo uma camada de orquestração universal no módulo \`shared/providers.js\` e \`electron/chatHandler.js\`.

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
| **Ollama** | Local / Offline | HTTP Local (\`:11434\`) | Sim (Modelos compatíveis) | Sim (LLaVA / Minicpm) |
| **LM Studio** | Local / Offline | HTTP Local (\`:1234\`) | Sim | Conforme modelo |
| **Mistral AI** | Nuvem | API REST / SSE | Sim | Sim (Pixtral) |
| **OpenRouter** | Agregador Universal | API REST / SSE | Sim | Sim |
| **Custom Endpoint**| Privado / Corporativo | OpenAI-compatible API | Sim | Configurável |

---

## 🔍 Descoberta Dinâmica de Modelos & Heurísticas

Em vez de listas estáticas de modelos hardcoded, o NeoChat interroga os endpoints de catálogo de cada provedor em tempo de execução, aplicando um cache inteligente de 5 minutos:

\`\`\`javascript
// shared/models.js - Heurística de Capacidades por Nomenclatura
export function inferModelCapabilities(modelId) {
  const lower = modelId.toLowerCase();
  return {
    supportsTools: /gpt-|claude-|llama-3\.[1-9]|qwen-2\.5|gemini|mistral|deepseek/.test(lower),
    supportsVision: /vision|llava|pixtral|gpt-4o|claude-3|gemini|llama-3\.2-(11b|90b)/.test(lower),
    supportsReasoning: /r1|qwq|o1|o3|reasoner|thinking/.test(lower),
    contextWindow: resolveContextSize(lower)
  };
}
\`\`\`

---

## ✂️ Gerenciamento Inteligente de Context Window (\`messageUtils.js\`)

Para evitar falhas por estouro de limite de tokens (\`context_length_exceeded\`), o \`chatHandler\` aplica um algoritmo de poda proporcional:

\`\`\`
Orçamento Total de Tokens do Modelo (Ex: 128.000)
┌─────────────────────────────────────────────────────────────────────────────┐
│ [System Prompt + RAG Context]  (Prioridade Alta - Sempre Preservado)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Mensagens Históricas Podadas] (Compactadas conforme o limite restante)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Últimas Interações do Chat]  (Prioridade Máxima - Integridade Garantida)  │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 🔀 Fallback Automático entre Provedores

Caso a requisição para o provedor primário falhe por instabilidade na rede ou rate limit (\`HTTP 429\`), o sistema ativa transparentemente o provedor secundário configurado pelo usuário, mantendo a sessão de chat sem interrupções.
`;

// 8. mcp.md
files['guide/mcp.md'] = `# Model Context Protocol (MCP) & Ferramentas Nativas

O **Model Context Protocol (MCP)** é um padrão aberto desenvolvido pela Anthropic que padroniza como aplicações fornecem contexto e ferramentas para modelos de linguagem. O NeoChat Desktop atua como um **MCP Client** completo e de alta performance.

---

## ⚙️ Arquitetura do MCP no NeoChat

O módulo \`electron/mcpManager.js\` orquestra conexões com servidores MCP através de dois canais de transporte:

\`\`\`
                       +----------------------+
                       |      mcpManager      |
                       +----------------------+
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
+-------------------------+                       +-------------------------+
|     Stdio Transport     |                       |      SSE Transport      |
|  (Servidores Locais)    |                       |  (Servidores Remotos)   |
+-------------------------+                       +-------------------------+
         │                                                 │
         ├─► run-node.cmd / .ps1 / .sh                     └─► http://remote-mcp:8080/sse
         ├─► run-python.cmd / .ps1 / .sh
         ├─► run-docker.cmd / .ps1 / .sh
         └─► run-uvx.cmd / .ps1 / .sh
\`\`\`

---

## 📜 Wrappers Multiplataforma (\`electron/scripts/\`)

Para garantir compatibilidade universal em **Windows, macOS e Linux**, o NeoChat não invoca interpretadores diretamente no shell. Ele utiliza scripts wrapper dedicados que resolvem variáveis de ambiente e executam os runtimes de forma segura:

\`\`\`
electron/scripts/
├── run-node.cmd      # Windows Batch wrapper
├── run-node.ps1      # Windows PowerShell wrapper
├── run-node.sh       # macOS POSIX shell wrapper
├── run-node-linux.sh # Linux específico
├── run-npx.cmd / .ps1 / .sh
├── run-uvx.cmd / .ps1 / .sh (Para ferramentas Python / uv)
└── run-docker.cmd / .ps1 / .sh (Para containers isolados)
\`\`\`

---

## 🔄 Ciclo de Descoberta & Execução de Ferramentas

\`\`\`
1. Inicialização ──► mcpManager conecta ao servidor (Handshake JSON-RPC 2.0)
2. Descoberta    ──► mcpManager invoca tools/list e recebe esquemas JSON Schema
3. Normalização  ──► Esquemas convertidos para formato Function Calling do provedor
4. Solicitação   ──► LLM decide invocar tool: { name: "search_files", args: { path: "src" } }
5. Permissão     ──► toolPermissionManager checa política de segurança
6. Execução      ──► mcpManager executa a chamada no servidor MCP
7. Retorno       ──► Resultado injetado como role: "tool" no histórico do LLM
8. Síntese       ──► LLM gera resposta final amigável com base nos dados reais
\`\`\`

---

## 🛠️ Exemplo de Configuração de Servidor MCP

No painel de configurações ou via \`settings.json\`, novos servidores MCP são declarados de forma simples:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\Workspace"],
      "enabled": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<safeStorage:token>"
      },
      "enabled": true
    }
  }
}
\`\`\`
`;

// 9. rag.md
files['guide/rag.md'] = `# RAG Local & Base de Conhecimento

O motor de **Retrieval-Augmented Generation (RAG)** do NeoChat Desktop permite que os modelos consultem documentos e bases de código privadas com **privacidade total e sem necessidade de envio a servidores de terceiros**.

---

## 📑 Ingestão Multiformato com \`officeparser\`

O serviço \`electron/ragService.js\` processa uma ampla variedade de formatos de arquivo locais:

- **Documentos de Texto:** \`.txt\`, \`.md\`, \`.json\`, \`.yaml\`, \`.csv\`, \`.xml\`
- **Documentos Office:** \`.docx\` (Word), \`.xlsx\` (Excel), \`.pptx\` (PowerPoint)
- **Documentos PDF:** \`.pdf\` com extração estruturada de páginas e texto
- **Arquivos de Código:** \`.js\`, \`.ts\`, \`.jsx\`, \`.py\`, \`.rs\`, \`.go\`, \`.cpp\`, \`.html\`, \`.css\`

---

## ⚙️ Pipeline de Processamento Semântico

\`\`\`
+-----------------------+
|  Arquivo Selecionado  |
+-----------------------+
           │
           ▼
+-----------------------+
|  Extração de Texto    |  (officeparser / leitor binário)
+-----------------------+
           │
           ▼
+-----------------------+
|  Chunking Semântico   |  (Segmentação em blocos de 800 caracteres com overlap de 150)
+-----------------------+
           │
           ▼
+-----------------------+
|  Geração de Vetores   |  (Embeddings de dimensão fixa)
+-----------------------+
           │
           ▼
+-----------------------+
|  Índice Vetorial      |  (Armazenado localmente em userData/rag_index/)
+-----------------------+
\`\`\`

---

## 🎯 Busca Semântica por Similaridade de Cossenos

Quando o usuário faz uma pergunta com RAG ativado, o \`ragService\` calcula a proximidade angular entre o vetor da pergunta e todos os chunks da base de conhecimento:

$$\\text{Similaridade}(u, v) = \\frac{u \\cdot v}{\\|u\\| \\|v\\|} = \\frac{\\sum_{i=1}^{n} u_i v_i}{\\sqrt{\\sum_{i=1}^{n} u_i^2} \\sqrt{\\sum_{i=1}^{n} v_i^2}}$$

Os $k$ fragmentos com maior pontuação de similaridade acima do limiar configurado (\`relevanceThreshold >= 0.72\`) são formatados e injetados diretamente na mensagem de sistema:

\`\`\`markdown
[CONTEXTO DA BASE DE CONHECIMENTO LOCAL]
Documento: relatorio_financeiro.docx (Página 3)
Trecho: O faturamento consolidado do terceiro trimestre registrou alta de 14.2%...

Utilize os fatos acima para responder à pergunta do usuário com precisão.
\`\`\`

---

## ⚡ Indexação Incremental Inteligente

Para evitar reindexação custosa de diretórios grandes, o \`ragService\` mantém uma tabela de hashes de arquivo (\`SHA-256\`). Apenas arquivos adicionados ou modificados desde a última execução são reprocessados.
`;

// 10. workflows-canvas.md
files['guide/workflows-canvas.md'] = `# Workflows, Canvas & Scheduler

Além do chat conversacional, o NeoChat Desktop conta com módulos avançados de produtividade para geração de artefatos, fluxos de trabalho automatizados em lote e agendamento de tarefas.

---

## 🎨 Canvas de Artefatos & Monaco Editor

O **Canvas** é uma área de trabalho lateral inspirada no conceito de artefatos de IA:

- **Monaco Editor Integrado:** Permite ao usuário inspecionar, editar e refatorar códigos gerados pela IA com intellisense, realce de sintaxe e autocompletar.
- **Visualizador Live:** Renderiza previews em tempo real para componentes HTML/Tailwind, documentos Markdown e diagramas.
- **Síntese de Voz (TTS):** Através de \`shared/ttsUtils.js\` e Web Speech API / modelos de áudio, o usuário pode ouvir a leitura em voz alta do conteúdo gerado no Canvas.

\`\`\`
+------------------------------+------------------------------------+
|         CHAT STREAM          |          CANVAS WORKSPACE          |
|                              |                                    |
| [Usuário]: Crie uma função   | +--------------------------------+ |
| de ordenação em TypeScript   | | Monaco Editor (TypeScript)     | |
|                              | | export function quickSort(arr) | |
| [IA]: Código gerado! Veja no | |   if (arr.length <= 1) return; | |
| Canvas ao lado.              | +--------------------------------+ |
|                              | [▶ Preview] [🔊 Ler TTS] [📋 Copiar]|
+------------------------------+------------------------------------+
\`\`\`

---

## 🔄 Motor de Workflows (\`workflowManager.js\`)

Os **Workflows** permitem criar cadeias de execução automatizadas onde a saída de uma etapa alimenta a entrada da próxima:

\`\`\`json
{
  "name": "Resumo Diário de Código",
  "steps": [
    {
      "id": "step-1",
      "action": "mcp:git:get_diff",
      "description": "Obtém as alterações do repositório local"
    },
    {
      "id": "step-2",
      "action": "llm:prompt",
      "template": "Resuma as seguintes alterações técnicas para o changelog: {{step-1.output}}"
    },
    {
      "id": "step-3",
      "action": "canvas:create_artifact",
      "title": "Changelog Diário"
    }
  ]
}
\`\`\`

---

## ⏰ Agendador em Segundo Plano (\`schedulerManager.js\`)

O **Scheduler** opera como um cron nativo de desktop:
- Executa verificações periódicas mesmo com a janela principal minimizada na bandeja do sistema (System Tray).
- Dispara notificações nativas do sistema operacional (\`new Notification({ title, body })\`) quando uma automação conclui.
`;

// 11. observability.md
files['guide/observability.md'] = `# Observabilidade & Métricas

O NeoChat Desktop inclui um subsistema completo de observabilidade local (\`electron/observabilityManager.js\`) para dar ao usuário transparência total sobre consumo de recursos, custos e latência de inferência.

---

## 📊 Métricas Rastreadas em Tempo Real

Para cada sessão e provedor de IA utilizado, são registradas as seguintes métricas:

\`\`\`
┌───────────────────────────┬────────────────────────────────────────────────────────┐
│ Métrica                   │ Descrição                                              │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ **Prompt Tokens**         │ Total de tokens consumidos no envio de contexto        │
│ **Completion Tokens**     │ Total de tokens gerados na resposta do modelo          │
│ **Time-to-First-Token**   │ Tempo em milissegundos até a chegada do primeiro chunk │
│ **Throughput (Tokens/s)** │ Velocidade efetiva de geração de texto da API          │
│ **Custo Estimado ($)**    │ Cálculo baseado na tabela pública de preços por modelo │
│ **Taxa de Erro / Retries**│ Quantidade de timeouts, rate-limits ou fallbacks       │
└───────────────────────────┴────────────────────────────────────────────────────────┘
\`\`\`

---

## 📈 Tabela de Precificação & Cálculo Local

O \`observabilityManager\` calcula o custo em repouso sem depender de APIs de faturamento externas:

$$\\text{Custo Total} = \\left(\\frac{\\text{Prompt Tokens}}{10^6} \\times \\text{Preço Input}\\right) + \\left(\\frac{\\text{Completion Tokens}}{10^6} \\times \\text{Preço Output}\\right)$$

Modelos locais (como Ollama e LM Studio) são automaticamente contabilizados com custo **\$0.00**.

---

## 📑 Logs Estruturados & Diagnóstico

Todos os eventos operacionais são salvos em formato legível em \`app.getPath('logs')/main.log\`, facilitando auditorias e diagnóstico de suporte.
`;

// 12. build-dist.md
files['guide/build-dist.md'] = `# Build, Empacotamento & CI/CD

O NeoChat Desktop possui uma esteira automatizada de compilação, empacotamento nativo e distribuição para todos os principais sistemas operacionais.

---

## 🏗️ Pipeline de Compilação Local

A compilação combina o bundler Vite para o frontend e o Electron Builder para o encapsulamento nativo:

\`\`\`
1. pnpm build           ──► Vite compila src/renderer/ para dist/
2. pnpm build:electron  ──► electron-builder empacota electron/ + dist/ + node_modules
3. Binários Finais      ──► Gerados no diretório release/
\`\`\`

---

## 📦 Configuração do \`electron-builder.yml\`

\`\`\`yaml
appId: com.giseldo.neochat
productName: NeoChat Desktop
directories:
  output: release
  buildResources: build

win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
  icon: public/icon.ico

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  category: public.app-category.productivity
  icon: public/icon.icns

linux:
  target:
    - target: AppImage
    - target: deb
  category: Utility
  icon: public/icon.png

publish:
  provider: github
  owner: giseldo
  repo: neochat-releases
\`\`\`

---

## 🚀 Fluxo de Lançamento de Releases

O processo padronizado de release segue a sequência:

1. Atualização de versão no \`package.json\` (SemVer).
2. Compilação dos binários: \`pnpm dist:win\` / \`pnpm dist:mac\` / \`pnpm dist:linux\`.
3. Criação de commit e tag git:
   \`\`\`bash
   git commit -am "chore(release): bump version to 1.3.0"
   git tag v1.3.0
   git push origin main && git push origin v1.3.0
   \`\`\`
4. Publicação automática dos artefatos no repositório de lançamentos \`giseldo/neochat-releases\` via \`pnpm release:publish\`.
`;

// 13. contributing.md
files['guide/contributing.md'] = `# Guia de Contribuição & Boas Práticas

Este guia detalha o fluxo de trabalho para desenvolvedores e engenheiros que desejam contribuir com o código-fonte do NeoChat Desktop.

---

## 💻 Configuração do Ambiente Local

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior.
- **pnpm**: Versão 10.x (\`pnpm is canonical\` — nunca utilize \`npm install\`).
- **Git**: Controle de versão configurado.

### Passos de Instalação

\`\`\`bash
# 1. Clonar o repositório
git clone https://github.com/giseldo/neochat-desktop.git
cd neochat-desktop

# 2. Instalar dependências canônicas
pnpm install

# 3. Executar o ambiente de desenvolvimento concorrente (Vite + Electron)
pnpm dev
\`\`\`

---

## 📐 Regras Arquiteturais Invioláveis

Ao submeter código para o repositório, certifique-se de respeitar os seguintes padrões:

1. **Separação de Módulos (CommonJS vs ESM):**
   - Todos os arquivos no processo principal (\`electron/\`) e compartilhados (\`shared/\`) utilizam **CommonJS** (\`require\` / \`module.exports\`).
   - Apenas os arquivos no processo de renderização (\`src/renderer/\`) utilizam **ESM / JSX** (\`import\` / \`export\`).

2. **Novas Chamadas de IPC:**
   - Ao adicionar um novo canal de comunicação, registre-o simultaneamente no \`electron/main.js\` (ou no manager correspondente) e exponha o método de forma tipada no \`electron/preload.js\`.
   - Nunca exponha \`ipcRenderer\` genérico para o renderer.

3. **Scripts de Servidores MCP:**
   - Ao adicionar um novo runtime de MCP, sempre crie as três extensões (\`.cmd\`, \`.ps1\`, \`.sh\`) mais a variante Linux (\`-linux.sh\`) dentro de \`electron/scripts/\` e registre em \`commandResolver.js\`.

4. **Documentação Local:**
   - Execute \`pnpm docs:dev\` para testar alterações na documentação e \`pnpm docs:build\` para validar a compilação do VitePress.
`;

Object.entries(files).forEach(([relPath, content]) => {
  const fullPath = path.join(docsDir, relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Written: ' + relPath);
});

console.log('All 13 documentation pages created successfully!');
