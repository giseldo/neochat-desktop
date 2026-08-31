# Model Context Protocol (MCP) & Ferramentas Nativas

O **Model Context Protocol (MCP)** é um padrão aberto desenvolvido pela Anthropic que padroniza como aplicações fornecem contexto e ferramentas para modelos de linguagem. O NeoChat Desktop atua como um **MCP Client** completo e de alta performance.

---

## ⚙️ Arquitetura do MCP no NeoChat

O módulo `electron/mcpManager.js` orquestra conexões com servidores MCP através de dois canais de transporte:

```
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
```

---

## 📜 Wrappers Multiplataforma (`electron/scripts/`)

Para garantir compatibilidade universal em **Windows, macOS e Linux**, o NeoChat não invoca interpretadores diretamente no shell. Ele utiliza scripts wrapper dedicados que resolvem variáveis de ambiente e executam os runtimes de forma segura:

```
electron/scripts/
├── run-node.cmd      # Windows Batch wrapper
├── run-node.ps1      # Windows PowerShell wrapper
├── run-node.sh       # macOS POSIX shell wrapper
├── run-node-linux.sh # Linux específico
├── run-npx.cmd / .ps1 / .sh
├── run-uvx.cmd / .ps1 / .sh (Para ferramentas Python / uv)
└── run-docker.cmd / .ps1 / .sh (Para containers isolados)
```

---

## 🔄 Ciclo de Descoberta & Execução Unificada

No NeoChat Desktop, as ferramentas MCP são unificadas com as ferramentas nativas de sistema através do `ToolRegistry` e `ToolExecutor`:

```
1. Inicialização ──► mcpManager conecta ao servidor (Handshake JSON-RPC 2.0 stdio ou SSE)
2. Descoberta    ──► mcpManager invoca tools/list e recebe esquemas JSON Schema
3. Unificação    ──► Injetadas no ToolRegistry com prefixos e metadados de servidor
4. Normalização  ──► Esquemas convertidos para formato Function Calling (OpenAI/Groq)
5. Solicitação   ──► LLM decide invocar tool: { name: "github_create_issue", args: { ... } }
6. Permissão     ──► permissionEngine avalia política (ALLOW, PROMPT com ToolApprovalModal, ou DENY)
7. Execução      ──► toolExecutor delega ao mcpManager ou handler nativo
8. Retorno       ──► Resultado injetado como role: "tool" no histórico do AgentLoop
9. Síntese       ──► LLM prossegue com a próxima iteração autônoma ou gera resposta final
```

---

## 🔐 Autenticação OAuth 2.0 para Servidores Remotos (`authManager.js`)

Para servidores MCP em nuvem que exigem autenticação protegida por usuário:

- **RFC 7591 Dynamic Client Registration:** O NeoChat registra-se dinamicamente no servidor de autorização.
- **PKCE & State:** Geração criptográfica segura de `code_verifier` e `state`.
- **Servidor Local de Redirecionamento:** O Electron inicializa um listener HTTP em porta dinâmica para capturar o callback com segurança e persistir os tokens criptografados.

---

## 🛠️ Exemplo de Configuração de Servidor MCP

No painel de configurações ou via `settings.json`, novos servidores MCP são declarados de forma declarativa:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Projetos"],
      "enabled": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<safeStorage:token>"
      },
      "enabled": true
    },
    "postgres": {
      "command": "uvx",
      "args": ["mcp-server-postgres", "--connection-string", "postgresql://localhost/mydb"],
      "enabled": true
    }
  }
}
```
