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

## 🚦 Sistema de Permissões Granular de Ferramentas

Para evitar que ferramentas do Model Context Protocol (como exclusão de arquivos, comandos de terminal ou requisições de rede) sejam disparadas sem consentimento, o `toolPermissionManager.js` implementa políticas de aprovação:

1. **Auto-Permitir (Read-Only):** Ferramentas estritamente de leitura podem ser pré-autorizadas pelo usuário.
2. **Confirmação Explícita (Destructive / Write):** Chamadas com efeito colateral emitem um evento para a interface solicitando confirmação do usuário antes da execução no processo filho.
