# Projetos, Workspaces & Serviços Nativos

O NeoChat Desktop integra um conjunto de serviços de engenharia e utilitários nativos que conectam a inteligência artificial ao ambiente de desenvolvimento real do usuário.

---

## 📁 Gestão de Projetos & Workspaces (`projectManager.js`)

O **Project Manager** permite isolar contextos de trabalho, associando conversas, documentos de RAG e regras de desenvolvimento a projetos específicos.

```
+--------------------------------------------------------------------------------+
|                                PROJETO: NEOCHAT                                |
|  [ Cor: #f55036 ]  [ Ícone: ⚡ ]  [ Pastas: c:\Projetos\neochat-desktop ]     |
+--------------------------------------------------------------------------------+
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  [ Conversas Vinculadas ]     [ System Prompt Custom ]    [ Base RAG do Projeto ]
  • Refatoração IPC           • "Siga o padrão CommonJS   • Indexação automática
  • Novo Algoritmo RAG          em electron/ e ESM em       dos arquivos da pasta
  • Design de Trajetória        src/renderer/..."           do projeto
```

### Características Principais:
- **Persistência Estruturada:** Salvo atomicamente em `userData/projects.json`.
- **System Prompts Contextuais:** Cada projeto pode sobrescrever ou enriquecer as instruções do modelo.
- **Desvinculação Segura:** Ao deletar um projeto, as conversas associadas não são perdidas — elas são suavemente desvinculadas.

---

## 🌿 Motor Git Local Integrado (`gitManager.js`)

O `gitManager` conecta o NeoChat diretamente ao repositório Git local do workspace sem necessidade de plugins externos:

```javascript
// Exemplo de verificação de status e diff
const status = await window.electron.gitStatus(workspacePath);
// Retorna: { branch: 'main', status: ' M electron/agent/runtime.js\n?? test.js' }

const diff = await window.electron.gitDiff(workspacePath);
// Retorna o diff unificado de arquivos alterados
```

- **Operações Nativas:** Validação rigorosa de diretório (`.git`), `git status`, `git diff`, `git commit` com mensagens semânticas e `git push`.
- **Segurança de Execução:** Os comandos são executados via `execFile` com flag `--no-optional-locks` e timeouts rigorosos de 30 segundos, evitando locks em operações concorrentes.

---

## 🏃 Code Runner Local Isolado (`codeRunner.js`)

O NeoChat possui um executor de código nativo para **Python** e **JavaScript/TypeScript**:

```
[ Código no Chat ou Canvas ]
             │
             ▼
[ codeRunner.executeLocalCode ]
  ├── 1. Auto-descoberta de interpretadores no PATH (python, py, python3, node)
  ├── 2. Criação de arquivo temporário seguro em os.tmpdir()/neochat-code-runner/
  ├── 3. Spawn do processo filho com buffer desativado (PYTHONUNBUFFERED=1)
  ├── 4. Monitoramento com timeout estrito (padrão: 20s)
  └── 5. Coleta de stdout, stderr, exitCode e limpeza atômica do arquivo temporário
```

- **Zero-Config:** Se o usuário tiver Python ou Node instalados na máquina, o runner detecta automaticamente as versões e os binários disponíveis.
- **Tratamento de Timeout:** Previne travamentos se o script do usuário contiver loops infinitos (`while True`).

---

## 🌐 Motor de Busca Web em Tempo Real (`webSearchService.js`)

Para enriquecer respostas com fatos atualizados, previsões, documentações recentes e links, o NeoChat implementa um motor de busca híbrido inteligente:

```
                          ┌───────────────────────────┐
                          │   Consulta de WebSearch   │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
       [ Provedor Nuvem Configurado ]          [ Provedor Local Padrão ]
       • Tavily API (Otimizado para LLMs)      • Direct Bing Web Scraper
       • Brave Search API                      • Zero-Config, 100% Gratuito
                    │                          • Sem necessidade de API Key
                    │ (Fallback se falhar)                  │
                    └───────────────────►───────────────────┘
                                        │
                                        ▼
                          [ Pipeline de Sanitização ]
                          ├── Decodificação de entidades HTML
                          ├── Remoção de tags e caracteres espúrios
                          └── Trimming inteligente de snippets (<= 220 chars)
```

- **Eficiência de Tokens:** Os snippets retornados são condensados para minimizar o consumo de tokens da janela de contexto.
- **Resiliência Total:** Se a chave da API em nuvem expirar ou falhar por rate-limit, o sistema ativa transparentemente o buscador local direto.

---

## 📸 Serviço de Captura de Tela (`screenCaptureService.js`)

Permite capturar instantaneamente a tela inteira ou janelas específicas de aplicativos para alimentar modelos de visão (Vision LLMs):

- Utiliza `desktopCapturer` e `screen` nativos do Electron.
- Enumera displays primários, monitores secundários e janelas abertas com seus respectivos ícones.
- Gera payloads `data:image/png;base64` otimizados para envio direto aos modelos multimodais (Claude 3.7, GPT-4o, Gemini 2.5 Flash, Llama 3.2 Vision).

---

## 💾 Backup & Recuperação de Desastres (`backupManager.js`)

Protege todo o patrimônio de conversas, configurações e projetos do usuário:

1. **Exportação Segura e Sanitizada:**
   - Gera um arquivo `neochat-backup-YYYY-MM-DD.json` versionado (`BACKUP_VERSION: 1`).
   - **Sanitização de Segredos:** Remove automaticamente chaves de API (`apiKeys`, `GROQ_API_KEY`, tokens OAuth) para que o arquivo de backup possa ser compartilhado ou armazenado em nuvem com segurança.
2. **Importação Atômica com Snapshot de Segurança:**
   - Valida a estrutura JSON antes de qualquer gravação.
   - Antes de aplicar o backup, cria um snapshot preventivo em `userData/backups/pre-import-<timestamp>/`.
   - Restaura chats e projetos sem risco de corrupção.

---

## 🔑 Motor de Autenticação OAuth 2.0 MCP (`authManager.js`)

Implementa a especificação oficial de autenticação da Anthropic para servidores MCP remotos e protegidos:

- **Descoberta de Metadados:** Interroga os endpoints `.well-known/oauth-authorization-server`.
- **Dynamic Client Registration (RFC 7591):** Registra o NeoChat Desktop dinamicamente como cliente OAuth no servidor remoto.
- **Servidor de Callback Efêmero Local:** Inicia dinamicamente um servidor HTTP local em porta livre (ex: `:10000+`) para interceptar o redirecionamento com `code` e `state` PKCE seguro.
- **Persistência de Tokens:** Armazena e renova tokens OAuth automaticamente com reconexão transparente ao MCP Server.
