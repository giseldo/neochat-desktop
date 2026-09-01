# Ponte IPC & Modelo de Segurança

A segurança é um pilar não-negociável no NeoChat Desktop. Por se tratar de um aplicativo de inteligência artificial com capacidade de executar comandos e integrar-se a serviços externos, a barreira entre o processo de renderização e o processo principal é estritamente isolada.

---

## 🛡️ Princípios de Isolamento e Zero-Trust

O NeoChat adota as melhores práticas de segurança recomendadas pelo time do Electron:

```javascript
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
```

- **`contextIsolation: true`**: O código JavaScript em execução no frontend (React) roda em um contexto de execução completamente isolado dos scripts internos do Electron.
- **`nodeIntegration: false`**: O frontend não pode executar `require('fs')`, `require('child_process')` ou qualquer outra API do Node.js diretamente.

---

## 🌉 A Ponte Segura: `electron/preload.js`

A única forma de comunicação entre a interface gráfica e o sistema operacional é através do objeto global congelado e controlado `window.electron`, exposto via `contextBridge`:

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Configurações & Provedores
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getProviders: () => ipcRenderer.invoke('get-providers'),
  
  // Streaming de Chat Push
  startChatStream: (params) => {
    cleanupChatStreamListeners();
    return ipcRenderer.invoke('start-chat-stream', params);
  },
  onChatChunk: (callback) => { /* Listener limpo automaticamente */ },
  onChatThinkChunk: (callback) => { /* Listener limpo automaticamente */ },

  // Neo Agent Runtime
  agent: {
    createSession: (options) =>
      ipcRenderer.invoke('agent:create-session', options),
    prompt: (sessionId, message, options) =>
      ipcRenderer.invoke('agent:prompt', sessionId, message, options),
    approveTool: (sessionId, requestId, alwaysAllow) =>
      ipcRenderer.invoke('agent:approve-tool', sessionId, requestId, alwaysAllow),
    rejectTool: (sessionId, requestId, reason) =>
      ipcRenderer.invoke('agent:reject-tool', sessionId, requestId, reason),
    cancel: (sessionId) =>
      ipcRenderer.invoke('agent:cancel', sessionId),
    rollback: (sessionId) =>
      ipcRenderer.invoke('agent:rollback', sessionId),
    getSession: (sessionId) =>
      ipcRenderer.invoke('agent:get-session', sessionId),
    getTrajectory: (sessionId, options) =>
      ipcRenderer.invoke('agent:get-trajectory', sessionId, options),
    getWorkspaceInfo: (workspaceRoot) =>
      ipcRenderer.invoke('agent:get-workspace-info', workspaceRoot),
    selectWorkspace: () =>
      ipcRenderer.invoke('agent:select-workspace'),
    listHarnesses: () =>
      ipcRenderer.invoke('agent:list-harnesses'),
    onEvent: (callback) => { /* Listener do canal agent:event */ }
  },

  // Projetos & Workspaces
  listProjects: () => ipcRenderer.invoke('projects-list'),
  createProject: (data) => ipcRenderer.invoke('projects-create', data),
  updateProject: (id, data) => ipcRenderer.invoke('projects-update', id, data),
  deleteProject: (id) => ipcRenderer.invoke('projects-delete', id),

  // Git & Terminal
  gitStatus: (repoPath) => ipcRenderer.invoke('git-status', repoPath),
  gitDiff: (repoPath) => ipcRenderer.invoke('git-diff', repoPath),
  gitCommit: (repoPath, msg) => ipcRenderer.invoke('git-commit', repoPath, msg),

  // Code Runner & Ferramentas Nativas
  executeLocalCode: (params) => ipcRenderer.invoke('code-runner-execute', params),
  executeWebSearch: (query, opts) => ipcRenderer.invoke('web-search-execute', { query, ...opts }),
  capturePrimaryScreen: () => ipcRenderer.invoke('screen-capture-primary'),

  // Backup & Segredos Criptográficos
  exportBackup: () => ipcRenderer.invoke('backup-export'),
  importBackup: () => ipcRenderer.invoke('backup-import'),
  setSecureSecret: (key, val) => ipcRenderer.invoke('secret-set', { key, val }),
  getSecureSecret: (key) => ipcRenderer.invoke('secret-get', { key })
});
```

---

## 🔒 Proteção Criptográfica de Credenciais (`secretStore.js`)

Chaves de API (OpenAI, Anthropic, Groq, Gemini) nunca são armazenadas em texto simples no arquivo de configurações. Elas passam pelo módulo `secretStore.js`, que utiliza a API `safeStorage` nativa do Electron:

```
+-----------------------+      safeStorage.encryptString(key)     +---------------------------+
| Chave em Texto Claro  | ───────────────────────────────────────> | Buffer Encriptado pelo SO |
| (Ex: gsk_xxxxxxx)     |                                         | (DPAPI / Keychain)        |
+-----------------------+                                         +---------------------------+
                                                                                │
                                                                                ▼
                                                                  Persistido em userData/
```

- No **Windows**: A criptografia utiliza a API nativa **DPAPI** (Data Protection API) vinculada à conta do usuário do Windows.
- No **macOS**: As credenciais são seladas utilizando a chave mestra do **Apple Keychain**.
- No **Linux**: É utilizado o **libsecret** / Secret Service API do desktop environment.

---

## 🚦 Motor de Permissões & Zero-Trust (`permissionEngine.js`)

Para garantir que o agente não execute comandos destrutivos inadvertidamente, o `PermissionEngine` aplica uma política de autorização em 3 níveis:

1. **`ALLOW` (Leitura Segura):** Ferramentas inócuas como `read_file`, `list_directory`, `glob_search`, `grep_search`, `git_status` e `query_project_knowledge` são auto-autorizadas em modo agente.
2. **`PROMPT` (Mutação / Execução):** Ferramentas que modificam arquivos (`write_file`, `edit_file`), rodam comandos no shell (`shell_exec`) ou realizam commits (`git_commit`) disparam uma solicitação visual no frontend (`ToolApprovalModal`).
3. **`DENY` (Acesso Proibido):** Ferramentas explicitamente bloqueadas nas configurações ou comandos fora do workspace são rejeitados de imediato.

### A fronteira independe do harness

O renderer nunca se comunica diretamente com o Neo Native, Pi ou qualquer adapter futuro. O caminho obrigatório é:

```text
Renderer → preload → IPC agent:* → NeoAgentRuntime → HarnessRegistry
                                               ↓
                              PermissionEngine → ToolExecutor
```

O harness controla o loop de inferência, mas recebe ferramentas encapsuladas pelo runtime. Assim, selecionar `agentHarness: "pi"` não amplia permissões nem cria uma rota alternativa para filesystem, processos ou MCP.

---

## 🛡️ Sandboxing de Diretório & Limites do Workspace

O `ToolExecutor` valida todos os caminhos de arquivo recebidos do modelo para garantir que a execução permaneça restrita aos limites do projeto (`workspaceRoot`):

- Bloqueio de caminhos maliciosos (`../..` fora da raiz autorizada).
- Gravação prévia de snapshots com `CheckpointsManager` antes de qualquer alteração, garantindo rollback instantâneo em caso de erro.
