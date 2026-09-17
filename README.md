# NeoChat Desktop

[Português](#neochat-desktop) | [English](#neochat-desktop-english)

O NeoChat Desktop é um espaço de trabalho e cliente de chat de IA para desktop, independente e universal. Conecte modelos locais (**Ollama, LM Studio, vLLM**) para ter 100% de privacidade e custo zero, ou use suas próprias chaves de API com provedores remotos (**Groq, OpenAI, Anthropic, DeepSeek, OpenRouter**), incluindo suporte a qualquer endpoint compatível com OpenAI. Disponível para Windows, macOS e Linux!


## Recursos

- **Universal e com múltiplos provedores**: conecte modelos locais (Ollama, LM Studio, LocalAI) ou APIs remotas (Groq, OpenAI, Claude, Mistral, DeepSeek, OpenRouter, Together AI, etc) e endpoints personalizados compatíveis com OpenAI.
- **Fallback inteligente entre provedores**: failover automático e ordenado entre provedores quando a API principal estiver indisponível ou limitada por taxa.
- **Multimodalidade e visão**: suporte completo a imagens, reconhecimento óptico, ferramenta de recorte de capturas de tela e análise visual.
- **Base de conhecimento local (RAG)**: indexação incremental e privada de arquivos (PDF, Word DOCX, Excel XLSX, Markdown e código), com busca semântica local.
- **Ecossistema MCP (Model Context Protocol)**: executores stdio locais (Node, Deno, Docker, NPX e UVX) e servidores HTTP remotos, com permissões detalhadas por ferramenta.
- **Integrações com o Google Workspace**: OAuth nativo para Gmail, Google Calendar e Google Drive, com aprovação humana protegida.
- **Ditado por voz e push-to-talk**: mantenha `Ctrl+Alt` pressionado em qualquer lugar para falar e solte para transcrever imediatamente, além de Text-to-Speech (TTS) configurável.
- **Dois modos de interface**: o **modo Usuário**, limpo e sem distrações para conversas do dia a dia, e o **modo Usuário avançado**, configurável para parâmetros de modelo, fallbacks, permissões do MCP, diagnósticos e ferramentas de desenvolvimento.
- **Armazenamento seguro de segredos nativo do sistema operacional**: criptografia de credenciais com suporte de hardware (SafeStorage / DPAPI / Keychain / Secret Service).
- **Integração protegida com Git**: inspecione diffs, visualize o status, crie commits e envie alterações com segurança pelo aplicativo.
- **Fluxos de trabalho e agendamentos**: fluxos automatizados reutilizáveis e compostos por várias etapas, com recorrência cron.
- **Observabilidade e controle de orçamento**: monitore o consumo de tokens e os custos estimados, com limites mensais e exportação em JSON/CSV.
- **Popup global e atalhos de teclado**: acesso instantâneo por meio de `Ctrl+G` / `Cmd+G` e do esquema de URI `groq://`.

## Modos Usuário e Usuário avançado

A interface começa no **modo Usuário**, que mantém o foco no chat e oculta os controles técnicos. Abra Configurações → Experiência da interface para trocar de modo a qualquer momento.

O **modo Usuário avançado** exibe parâmetros de modelo, fallback de provedores, endpoints e modelos personalizados, configuração e permissões do MCP, trajetórias, indexação da base de conhecimento, fluxos de trabalho e agendamentos, observabilidade, backups, atualizações e integração com Git. A preferência é armazenada localmente e não altera os chats existentes.

Credenciais sensíveis não são gravadas como texto simples nos backups exportados. Quando há suporte do sistema operacional, elas são criptografadas pelo armazenamento seguro nativo do Electron.

## Pré-requisitos

- Node.js (v18+)
- Gerenciador de pacotes pnpm

## Configuração

1. Clone este repositório
2. Instale as dependências:
   ```sh
   pnpm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```sh
   pnpm dev
   ```

## Configuração e provedores

O NeoChat Desktop oferece suporte a várias configurações de provedores:

1. **Modelos locais (Ollama / LM Studio)**:
   - Verifique se o Ollama ou o LM Studio está sendo executado localmente (por exemplo, `http://localhost:11434/v1` ou `http://localhost:1234/v1`).
   - Os modelos são detectados automaticamente ou podem ser configurados em Configurações.

2. **Provedores remotos e na nuvem**:
   - Adicione suas chaves de API em Configurações para **Groq**, **OpenAI**, **Anthropic**, **DeepSeek** ou qualquer endpoint personalizado compatível com OpenAI.
   - Chaves de provedores são configuradas pela tela de Configurações.

## Solução de problemas

### Problemas na instalação do Electron

Se aparecer um erro como "Electron failed to install correctly" ao executar `pnpm dev`, provavelmente o pnpm bloqueou os scripts de build por motivos de segurança. Para corrigir:

1. Remova a instalação corrompida:
   ```bash
   rm -rf node_modules
   ```

2. Reinstale as dependências:
   ```bash
   pnpm install
   ```

3. Aprove os scripts de build quando solicitado (ou execute manualmente):
   ```bash
   pnpm approve-builds
   ```
   Quando solicitado, selecione `electron` e `esbuild` para permitir a execução dos scripts pós-instalação.

4. Tente iniciar o servidor de desenvolvimento novamente:
   ```bash
   pnpm dev
   ```

## Build para produção

Para gerar o aplicativo para produção:

```sh
pnpm dist
```

Isso criará pacotes instaláveis no diretório `release` para a plataforma atual.

### Build para plataformas específicas

```bash
# Gerar para todas as plataformas compatíveis
pnpm dist

# Gerar apenas para macOS
pnpm dist:mac

# Gerar apenas para Windows
pnpm dist:win

# Gerar apenas para Linux
pnpm dist:linux
```

### Testar o suporte multiplataforma

Este aplicativo oferece suporte a Windows, macOS e Linux. Veja como testar a funcionalidade multiplataforma:

#### Executar testes multiplataforma

```bash
# Executar todos os testes de plataforma (incluindo o teste do Docker para Linux)
pnpm test:platforms

# Executar somente o teste básico de manipulação de caminhos
pnpm test:paths

# No Windows, executar o script de teste do PowerShell
.\tests\test-windows.ps1
```

### Testes de recursos

O repositório usa testes focados em Node.js. Alguns scripts disponíveis:

```bash
pnpm test:all-features
pnpm test:interface-mode
pnpm test:secret-store
pnpm test:tool-permissions
pnpm test:chat-branching
pnpm test:backup-manager
pnpm test:workflows
pnpm test:scheduler
pnpm test:rag-incremental
pnpm test:provider-fallback
pnpm test:tts-settings
pnpm test:update-manager
pnpm test:observability
pnpm test:git-manager
```

## Agradecimentos e Atribuição

Este projeto originou-se e evoluiu a partir do repositório de código aberto [`groq-desktop-beta`](https://github.com/groq/groq-desktop-beta) da **Groq, Inc.**, distribuído sob a licença MIT.

Agradecemos aos criadores e colaboradores originais pela base sólida que permitiu expandir o NeoChat Desktop para um ambiente de trabalho de inteligência artificial desktop multi-provedor com runtime de agentes autônomos, suporte a ferramentas MCP e RAG local.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.

---

# NeoChat Desktop (English)

NeoChat Desktop is an independent, universal desktop AI workspace and chat client. Connect local models (**Ollama, LM Studio, vLLM**) for 100% privacy and zero cost, or plug in your own API keys for remote providers (**Groq, OpenAI, Anthropic, DeepSeek, OpenRouter**) with support for any OpenAI-compatible endpoint. Available for Windows, macOS, and Linux!

> **Note for macOS Users**: After installing on macOS, you may need to run this command to open the app:
> ```sh
> xattr -c /Applications/Neochat\ Desktop.app
> ```

## Unofficial Homebrew Installation (macOS)

You can install the latest release using [Homebrew](https://brew.sh/) via an unofficial tap:

```sh
brew tap ricklamers/groq-desktop-unofficial
brew install --cask groq-desktop
# Allow the app to run
xattr -c /Applications/Neochat\ Desktop.app
```

## Features

- **Universal & Multi-Provider**: Connect local models (Ollama, LM Studio, LocalAI) or remote APIs (Groq, OpenAI, Claude, DeepSeek, OpenRouter, Together AI) and custom OpenAI-compatible endpoints.
- **Intelligent Provider Fallback**: Automatic ordered failover between providers if your primary API is down or rate-limited.
- **Multimodal & Vision**: Full image support, optical recognition, screenshot snip tool, and visual analysis.
- **Local Knowledge Base (RAG)**: Private incremental file indexing (PDF, Word DOCX, Excel XLSX, Markdown, code) with local semantic search.
- **MCP Ecosystem (Model Context Protocol)**: Local stdio runners (Node, Deno, Docker, NPX, UVX) and remote HTTP servers with fine-grained per-tool permissions.
- **Google Workspace Connectors**: Native OAuth for Gmail, Google Calendar, and Google Drive with guarded human approval.
- **Voice Dictation & Push-to-Talk**: Hold `Ctrl+Alt` anywhere to speak and release to instantly transcribe, plus configurable Text-to-Speech (TTS).
- **Dual Interface Modes**: Clean **User mode** for distraction-free everyday chat and a configurable **Power user mode** for model parameters, fallbacks, MCP permissions, diagnostics, and developer tools.
- **OS-Native Encrypted Secret Store**: Hardware-backed credential encryption (SafeStorage / DPAPI / Keychain / Secret Service).
- **Guarded Git Integration**: Inspect diffs, view status, create commits, and push changes safely from the app.
- **Workflows & Schedules**: Reusable multi-step automated workflows with cron recurrence.
- **Observability & Budget Tracking**: Monitor token consumption and estimated costs with monthly budget limits and JSON/CSV export.
- **Global Popup & Hotkeys**: Instant access via `Ctrl+G` / `Cmd+G` and `groq://` URI scheme.

## User and Power User modes

The interface starts in **User mode**, which keeps the chat focused and hides technical controls. Open Settings → Interface experience to switch modes at any time.

**Power user mode** reveals model parameters, provider fallback, custom endpoints and models, MCP configuration and permissions, trajectories, knowledge indexing, workflows and schedules, observability, backups, updates, and Git integration. The preference is stored locally and does not change existing chats.

Sensitive credentials are not written as plain text to exported backups. When supported by the operating system, they are encrypted through Electron's native secure storage.

## Prerequisites

- Node.js (v18+)
- pnpm package manager

## Setup

1. Clone this repository
2. Install dependencies:
   ```sh
   pnpm install
   ```
3. Start the development server:
   ```sh
   pnpm dev
   ```

## Configuration & Providers

NeoChat Desktop supports multiple provider configurations:

1. **Local Models (Ollama / LM Studio)**:
   - Ensure Ollama or LM Studio is running locally (e.g., `http://localhost:11434/v1` or `http://localhost:1234/v1`).
   - Models are automatically detected or can be configured in Settings.

2. **Cloud & Remote Providers**:
   - Add your API keys in Settings for **Groq**, **OpenAI**, **Anthropic**, **DeepSeek**, or any custom OpenAI-compatible endpoint.
   - Provider keys are configured through the Settings screen.

## Troubleshooting

### Electron Installation Issues

If you encounter an error like "Electron failed to install correctly" when running `pnpm dev`, this is likely because pnpm blocked the build scripts for security reasons. To fix this:

1. Remove the corrupted installation:
   ```bash
   rm -rf node_modules
   ```

2. Reinstall dependencies:
   ```bash
   pnpm install
   ```

3. Approve the build scripts when prompted (or run manually):
   ```bash
   pnpm approve-builds
   ```
   Select `electron` and `esbuild` when prompted to allow their post-install scripts to run.

4. Try running the dev server again:
   ```bash
   pnpm dev
   ```

## Building for Production

To build the application for production:

```sh
pnpm dist
```

This will create installable packages in the `release` directory for your current platform.

### Building for Specific Platforms

```bash
# Build for all supported platforms
pnpm dist

# Build for macOS only
pnpm dist:mac

# Build for Windows only
pnpm dist:win

# Build for Linux only
pnpm dist:linux
```

### Testing Cross-Platform Support

This app supports Windows, macOS, and Linux. Here's how to test cross-platform functionality:

#### Running Cross-Platform Tests

```bash
# Run all platform tests (including Docker test for Linux)
pnpm test:platforms

# Run basic path handling test only
pnpm test:paths

# If on Windows, run the PowerShell test script
.\tests\test-windows.ps1
```

### Feature tests

The repository uses focused Node.js tests. Available scripts include:

```bash
pnpm test:all-features
pnpm test:interface-mode
pnpm test:secret-store
pnpm test:tool-permissions
pnpm test:chat-branching
pnpm test:backup-manager
pnpm test:workflows
pnpm test:scheduler
pnpm test:rag-incremental
pnpm test:provider-fallback
pnpm test:tts-settings
pnpm test:update-manager
pnpm test:observability
pnpm test:git-manager
```

## Acknowledgments & Attribution

This project originated and evolved from the open-source repository [`groq-desktop-beta`](https://github.com/groq/groq-desktop-beta) by **Groq, Inc.**, distributed under the MIT License.

We extend our gratitude to the original creators and contributors for providing the solid foundation that enabled NeoChat Desktop to expand into a universal desktop AI workspace with autonomous agent runtimes, local RAG, and MCP tool ecosystem.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
