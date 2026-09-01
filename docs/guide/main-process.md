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

## 🗂️ Mapeamento dos Managers e Subsistemas Especializados

Para manter alta coesão e baixo acoplamento, as responsabilidades do processo principal são rigorosamente particionadas:

### 1. `electron/agent/` (Neo Agent Runtime)
- **Responsabilidade:** Fachada de sessões autônomas com harness selecionável, ferramentas e segurança compartilhadas.
- **Componentes:**
  - `runtime.js`: Orquestra sessões, workspace, persistência, cancelamento e rollback.
  - `harnessRegistry.js`: Resolve o harness configurado e expõe os adapters disponíveis.
  - `harnesses/nativeHarness.js`: Adapter do loop Neo Native, padrão do aplicativo.
  - `harnesses/piHarness.js`: Adapter do Pi Agent Core para o protocolo de eventos e ferramentas Neo.
  - `agentLoop.js`: ReAct loop autônomo com controle de iterações e auto-recuperação.
  - `eventBus.js`: Barramento de eventos tipados em tempo real (`AGENT_EVENTS`).
  - `modelRouter.js`: Roteamento inteligente de modelos e normalização de requisições.
  - `toolRegistry.js` & `toolExecutor.js`: Catálogo unificado de ferramentas nativas e MCP.
  - `permissionEngine.js`: Políticas de segurança e aprovações interativas do usuário.
  - `checkpoints.js`: Snapshots de arquivos e rollback instantâneo de mutações.
  - `shellManager.js`: Terminal persistente com isolamento de processos e timeout.
  - `compactionManager.js`: Monitoramento de janela de contexto e compactação inteligente.
  - `workspaceManager.js`: Inspeção de workspaces, `AGENTS.md` e regras de repositório.
  - `sessionStore.js`: Persistência local de snapshots e logs de trajetória.
  - `swarmManager.js`: Coordenação opcional de papéis e sessões em execuções multiagente.
  - `pathPolicy.js` & `processPolicy.js`: Limites de acesso a caminhos e execução de processos.

O `NeoAgentRuntime` é a única fachada consumida pelo IPC. O harness pode variar, mas ferramentas, permissões, checkpoints, sessões e eventos permanecem sob responsabilidade do runtime.

### 2. `chatHandler.js` & `messageUtils.js`
- **Responsabilidade:** Motor central de streaming e poda conversacional.
- **Funções:**
  - Injeção dinâmica de System Prompts e resolução do provedor ativo.
  - Emissão de chunks de raciocínio (`<think>`) e de resposta final.
  - Poda e cálculo determinístico de tokens para proteção do context window.

### 3. `mcpManager.js` & `authManager.js`
- **Responsabilidade:** Gerenciamento do ciclo de vida de ferramentas MCP e OAuth 2.0.
- **Funções:**
  - Conexão stdio via wrappers (`electron/scripts/run-*.cmd|.ps1|.sh`) e transporte SSE.
  - Dynamic Client Registration (RFC 7591) e servidor local efêmero de autenticação.
  - Descoberta e normalização de ferramentas para o formato Function Calling dos provedores.

### 4. `projectManager.js`
- **Responsabilidade:** Gerenciamento de múltiplos projetos e workspaces.
- **Funções:**
  - Criação, edição, cores de identificação e prompts de sistema customizados por projeto.
  - Agrupamento de conversas e vinculação de pastas locais.

### 5. `gitManager.js`
- **Responsabilidade:** Integração com repositórios Git locais.
- **Funções:**
  - Inspeciona status do repositório, branches ativas e histórico recente.
  - Gera diffs unificados e executa commits convencionais com segurança via `execFile`.

### 6. `codeRunner.js`
- **Responsabilidade:** Execução local e isolada de scripts Python e JavaScript.
- **Funções:**
  - Auto-descoberta de interpretadores instalados no PATH do sistema.
  - Execução controlada em diretório temporário com timeouts estritos e captura de saída.

### 7. `webSearchService.js`
- **Responsabilidade:** Busca na Web em tempo real.
- **Funções:**
  - Provedor local direto (zero-config, Bing scraping) e nuvem (Tavily, Brave).
  - Sanitização de entidades HTML e condensação de snippets para economia de tokens.

### 8. `screenCaptureService.js` & `contextCapture.js`
- **Responsabilidade:** Captura visual e contextual do sistema.
- **Funções:**
  - Enumeração de telas e janelas abertas para envio de imagens aos modelos de visão.
  - Captura global de atalho `Ctrl+G` / `Cmd+G` e clipboard para o `popupWindow.js`.

### 9. `ragService.js`
- **Responsabilidade:** Mecanismo de **Retrieval-Augmented Generation** local.
- **Funções:**
  - Leitura e extração de texto em formatos binários e estruturados via `officeparser`.
  - Chunking semântico com overlap e cálculo de similaridade de cossenos.
  - Indexação incremental baseada em hashes SHA-256.

### 10. `settingsManager.js` & `secretStore.js`
- **Responsabilidade:** Configurações persistentes e segurança de credenciais.
- **Funções:**
  - Persistência em `userData/settings.json` com fallback em variáveis de ambiente.
  - Encriptação de chaves em repouso usando a API nativa `safeStorage` (DPAPI/Keychain).

### 11. `backupManager.js`
- **Responsabilidade:** Backup e recuperação de desastres.
- **Funções:**
  - Exportação JSON completa com sanitização automática de segredos.
  - Importação segura com criação prévia de snapshot de recuperação.

### 12. `canvasManager.js`, `workflowManager.js` & `schedulerManager.js`
- **Responsabilidade:** Produtividade avançada e automação.
- **Funções:**
  - Gerenciamento de documentos Monaco Editor e síntese de voz (TTS).
  - Pipelines automatizados em etapas e agendamentos periódicos em background.

---

## 🌐 Deep Linking & Integração com o SO

O NeoChat registra esquemas de protocolo de URL customizados (`groq://` e `neochat://`):

```javascript
// Exemplo de URL de contexto:
// groq://context?text=Analise%20este%20codigo&title=QueryRapida&source=VSCode

function handleUrlProtocol(url) {
  if (!url.startsWith('groq://') && !url.startsWith('neochat://')) return null;
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
