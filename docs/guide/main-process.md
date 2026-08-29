# Arquitetura do Processo Principal (Electron Main)

O Processo Principal é o coração do NeoChat Desktop. Ele roda diretamente sobre o ambiente Node.js com privilégios completos de sistema, sendo responsável pelo ciclo de vida da aplicação, gerenciamento de janelas, comunicação com APIs externas, execução de servidores MCP e persistência de dados.

---

## 🏁 Inicialização & Bootstrap

O arquivo `electron/main.js` realiza a inicialização em ordem estrita de dependências:

```
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
```

---

## 🗂️ Mapeamento dos Managers Especializados

Para evitar o anti-padrão de um arquivo `main.js` monolítico, as responsabilidades são estritamente particionadas em módulos especialistas:

### 1. `chatHandler.js`
- **Responsabilidade:** Motor central de execução de conversas.
- **Funções:**
  - Montagem de mensagens e injeção de System Prompts dinâmicos.
  - Streaming push via `webContents.send('chat-chunk', ...)`.
  - Extração e emissão de raciocínio (`<think>`).
  - Execução de tool calls do modelo em loop recursivo com servidores MCP.
  - Poda e compressão de histórico usando `messageUtils.js`.

### 2. `mcpManager.js`
- **Responsabilidade:** Gerenciador do ciclo de vida do **Model Context Protocol**.
- **Funções:**
  - Inicialização de processos filhos (stdio) utilizando wrappers de ambiente (`electron/scripts/run-*.cmd|.ps1|.sh`).
  - Conexão com servidores MCP remotos via Server-Sent Events (SSE).
  - Descoberta dinâmica de ferramentas (`tools/list`), recursos (`resources/list`) e prompts (`prompts/list`).
  - Normalização dos esquemas de parâmetros JSON Schema para os formatos esperados pelos provedores de LLM.

### 3. `ragService.js`
- **Responsabilidade:** Mecanismo de **Retrieval-Augmented Generation** local.
- **Funções:**
  - Leitura e extração de texto em formatos binários e estruturados via `officeparser`.
  - Quebra semântica em chunks com sobreposição de janelas.
  - Vetorização e cálculo de similaridade de cossenos no espaço de embeddings.
  - Indexação incremental baseada no hash de modificação dos arquivos.

### 4. `settingsManager.js` & `secretStore.js`
- **Responsabilidade:** Persistência de configurações e armazenamento criptográfico de credenciais.
- **Funções:**
  - Armazenamento em `userData/settings.json` com mesclagem atômica de padrões.
  - Encriptação de chaves de API em repouso através da API `safeStorage` nativa do Electron (Windows DPAPI, macOS Keychain, Linux Secret Service).

### 5. `canvasManager.js`
- **Responsabilidade:** Gerenciador de artefatos de trabalho e síntese de voz.
- **Funções:**
  - Salvamento, versionamento e exportação de códigos e documentos editados no Canvas.
  - Integração com utilitários de síntese de áudio (TTS) para leitura de artefatos.

### 6. `workflowManager.js` & `schedulerManager.js`
- **Responsabilidade:** Automação de pipelines de prompts e agendamentos.
- **Funções:**
  - Execução encadeada de passos com substituição de variáveis contextuais.
  - Execução em segundo plano de tarefas programadas (estilo cron) com notificações de sistema.

### 7. `popupWindow.js` & `contextCapture.js`
- **Responsabilidade:** Interface de acesso rápido global.
- **Funções:**
  - Exibição de uma janela flutuante sem bordas disparada por `Ctrl+G` (ou `Cmd+G`).
  - Captura inteligente do conteúdo do clipboard ou texto selecionado em outros aplicativos para consulta imediata de IA.

---

## 🌐 Deep Linking & Integração com o SO

O NeoChat registra esquemas de protocolo de URL customizados (`groq://` e `neochat://`):

```javascript
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
```
