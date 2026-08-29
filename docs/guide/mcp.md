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

## 🔄 Ciclo de Descoberta & Execução de Ferramentas

```
1. Inicialização ──► mcpManager conecta ao servidor (Handshake JSON-RPC 2.0)
2. Descoberta    ──► mcpManager invoca tools/list e recebe esquemas JSON Schema
3. Normalização  ──► Esquemas convertidos para formato Function Calling do provedor
4. Solicitação   ──► LLM decide invocar tool: { name: "search_files", args: { path: "src" } }
5. Permissão     ──► toolPermissionManager checa política de segurança
6. Execução      ──► mcpManager executa a chamada no servidor MCP
7. Retorno       ──► Resultado injetado como role: "tool" no histórico do LLM
8. Síntese       ──► LLM gera resposta final amigável com base nos dados reais
```

---

## 🛠️ Exemplo de Configuração de Servidor MCP

No painel de configurações ou via `settings.json`, novos servidores MCP são declarados de forma simples:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\Users\Workspace"],
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
```
