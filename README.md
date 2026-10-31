# NeoChat Desktop

[Português](#neochat-desktop) | [English](#neochat-desktop-english)

O NeoChat Desktop é um espaço de trabalho e cliente de chat de IA para desktop, independente e universal. Conecte modelos locais (**Ollama, LM Studio, vLLM**) para ter 100% de privacidade e custo zero, ou use suas próprias chaves de API com provedores remotos (**Groq, OpenAI, Anthropic, DeepSeek, OpenRouter**), incluindo suporte a qualquer endpoint compatível com OpenAI. Disponível para Windows, macOS e Linux!

<img width="1910" height="1018" alt="image" src="https://github.com/user-attachments/assets/06ec5b4e-d867-4bff-bb8b-035b78b7911f" />


## Recursos

- **Universal e com múltiplos provedores**: conecte modelos locais (**Ollama, LM Studio, vLLM, LocalAI**) ou APIs remotas (**Groq, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Perplexity, OpenRouter, Together AI**) e endpoints personalizados compatíveis com OpenAI.
- **Runtime de Agentes Autônomos (Neo Agent)**: máquina de estados formal, streaming de raciocínio, checkpoints de arquivos com reversão (*undo*), políticas rígidas de segurança para caminhos/processos e aprovação granular de ações.
- **Ecossistema MCP (Model Context Protocol)**: executores locais Stdio (Node, Deno, Docker, NPX e UVX/Python) e servidores remotos HTTP/SSE, com catálogo e hub de ferramentas integrado.
- **Base de conhecimento local (RAG) & Grafo**: indexação incremental privada de arquivos (PDF, Word DOCX, Excel XLSX, Markdown e código), com busca semântica local e visualização em Grafo de Conhecimento 2D/3D.
- **Painéis de Produtividade & Workspace Integrado**:
  - **Canvas**: editor de documentos interativo com cálculo de métricas e exportação nativa para Word (.DOCX) e PDF.
  - **Terminal Interativo**: sessões completas em abas (PowerShell, Bash, CMD) com renderização ANSI em tempo real.
  - **Navegador Web Embutido**: navegação e pesquisa integrada sem sair do aplicativo.
  - **Gerenciador de Tarefas em Segundo Plano**: acompanhamento e logs de processos assíncronos.
  - **Explorador de Arquivos**: árvore de navegação do projeto aberto.
- **Swarm Multi-Agente**: colaboração em equipe nos modos **Paralelo**, **Pipeline** (encadeado) e **Debate dialético**, com papéis especializados (Arquiteto, Revisor, Segurança, etc.).
- **Memória de Longo Prazo (Long-Term Memory)**: extração contínua e persistência de fatos, diretrizes de código e preferências contextuais entre sessões.
- **Fallback Inteligente entre provedores**: failover automático e ordenado entre provedores quando a API principal estiver indisponível ou sofrer limitação de taxa (*rate-limit* / 429 / 5xx).
- **Multimodalidade, Visão & Geração de Imagens**: suporte a modelos de visão, ferramenta de recorte de capturas de tela (*snip tool*), e geração de imagens integrada com **xAI Grok Imagine** e **OpenAI DALL-E 3**.
- **Integrações com o Google Workspace**: OAuth nativo para Gmail, Google Calendar e Google Drive, com aprovação humana obrigatória (*human-in-the-loop*).
- **Integração Protegida com Git**: inspecione status, visualize diffs, crie commits e faça push com segurança diretamente pelo app.
- **Ditado por voz e push-to-talk**: mantenha `Ctrl+Alt` pressionado em qualquer lugar para falar e solte para transcrever via Groq Whisper API, além de Text-to-Speech (TTS) customizável.
- **Armazenamento seguro nativo do SO**: chaves e credenciais criptografadas via hardware pelo `safeStorage` (DPAPI no Windows, Keychain no macOS e Secret Service no Linux).
- **Workflows e Agendamentos (Cron)**: fluxos automatizados em etapas com execução periódica programada.
- **Observabilidade e Controle de Orçamento**: métricas de consumo de tokens, custos estimados, teto de orçamento mensal e exportação em JSON/CSV.
- **Módulos Criativos & Labs**: AI Arena (comparação e debate lado a lado entre modelos), Live Sandbox (preview em tempo real de React e Tailwind CSS) e Podcast Studio.
- **Dois Modos de Interface**: o **modo Usuário**, limpo e sem distrações para conversas do dia a dia, e o **modo Usuário Avançado (Power User)**, com controle total de parâmetros, fallbacks, permissões de MCP e diagnósticos.
- **Popup global e atalhos de teclado**: acesso instantâneo por meio de `Ctrl+G` / `Cmd+G` e do esquema de URI `groq://`.

## 🆚 O que este projeto tem a mais que o fork original?

Este projeto originou-se do [`groq-desktop-beta`](https://github.com/groq/groq-desktop-beta) da Groq, Inc. Enquanto o projeto original foi concebido apenas como um cliente de chat exclusivo para a API em nuvem da Groq com recursos simples de voz e atalhos, o **NeoChat Desktop** foi reformulado para ser uma **estação de trabalho autônoma universal de inteligência artificial**.

### Tabela Comparativa

| Funcionalidade / Módulo | Fork Original (`groq-desktop-beta`) | NeoChat Desktop (Este Repositório) |
| :--- | :--- | :--- |
| **Provedores de Nuvem** | Apenas Groq Cloud API | **Universal**: Groq, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Perplexity, OpenRouter, Together AI, SambaNova, Cohere + qualquer endpoint compatível com OpenAI |
| **Modelos Locais (Offline & Privado)** | ❌ Sem suporte | ✅ **Ollama, LM Studio, vLLM e LocalAI** com detecção automática, 100% privacidade e custo zero |
| **Fallback Automático (Failover)** | ❌ Não possui | ✅ Alternância automática ordenada entre provedores caso a API principal caia ou sofra *rate-limit* (429/5xx) |
| **Runtime de Agentes Autônomos** | ❌ Não possui | ✅ Motor autônomo completo (`Neo Agent Runtime`) com máquina de estados, eventos tipados, checkpoints com reversão (*undo*) e políticas de segurança |
| **Ecossistema MCP (Model Context Protocol)** | ❌ Não possui | ✅ Executores Stdio locais (Node, NPX, UVX/Python, Deno, Docker) e conexões HTTP/SSE remotas, com catálogo e controle granular de permissões |
| **Base de Conhecimento Local (RAG)** | ❌ Não possui | ✅ Indexação incremental de PDFs, Word (.docx), Excel (.xlsx), Markdown e código-fonte, com busca semântica local e Grafo de Conhecimento 2D/3D |
| **Workspace & Canvas de Documentos** | ❌ Não possui | ✅ Editor interativo com métricas de leitura, edição cirúrgica de trechos com diff e exportação nativa para Word (.DOCX) e PDF |
| **Terminal Interativo Embutido** | ❌ Não possui | ✅ Terminal integrado com abas (PowerShell, Bash, CMD) e streaming ANSI |
| **Navegador Web Integrado** | ❌ Não possui | ✅ Navegador web isolado embutido para pesquisas rápidas sem sair do aplicativo |
| **Equipes Multi-Agente (Swarm)** | ❌ Não possui | ✅ Colaboração em modos Paralelo, Pipeline e Debate entre agentes com papéis especializados (Arquiteto, Revisor, Segurança, etc.) |
| **Memória de Longo Prazo (Long-Term Memory)** | ❌ Não possui | ✅ Aprendizado contínuo automático de preferências, regras de código e fatos do usuário |
| **Segurança e Cofre de Credenciais** | Armazenamento simples | ✅ Criptografia nativa por hardware (`safeStorage` / DPAPI / Keychain / Secret Service) |
| **Integração com Git** | ❌ Não possui | ✅ Inspecione status, veja diffs, crie commits e faça push com segurança diretamente pelo app |
| **Conectores do Google Workspace** | ❌ Não possui | ✅ Integração OAuth com Gmail, Calendar e Drive com aprovação humana obrigatória |
| **Geração de Imagens** | ❌ Não possui | ✅ Geração nativa com **xAI Grok Imagine** e **OpenAI DALL-E 3** com controle de formato/proporções |
| **Automação e Agendamentos (Cron)** | ❌ Não possui | ✅ Workflows multi-etapas encadeados e agendador com expressões Cron |
| **Observabilidade e Custos** | ❌ Não possui | ✅ Rastreamento de tokens em tempo real, estimativa de custos, teto mensal de gastos e relatórios CSV/JSON |
| **Modos de Interface (Dual Mode)** | Interface única fixa | ✅ **Modo Usuário** (focado e limpo) e **Modo Power User** (completo para desenvolvedores) |
| **Módulos Criativos & Labs** | ❌ Não possui | ✅ AI Arena (comparação lado a lado de modelos), Live Sandbox (preview React/Tailwind) e Podcast Studio |
| **Gerenciamento Avançado de Histórico** | Histórico simples | ✅ Ramificação de conversas (*branching*), organização por Projetos, busca avançada e blocos retráteis de raciocínio (*Thinking blocks*) |

### Principais Destaques Exclusivos

1. **Liberdade Total de Modelos e Privacidade**: Enquanto o fork original restringia o uso à nuvem da Groq, aqui você pode usar qualquer modelo do mercado — ou rodar modelos como Llama 3, DeepSeek R1 e Qwen 2.5 localmente no seu computador via Ollama ou LM Studio sem enviar dados para a nuvem.
2. **Capacidade Autônoma Real (Neo Agent & MCP)**: O NeoChat Desktop não é apenas uma caixa de mensagens. O agente pode inspecionar seu workspace, rodar comandos de terminal com segurança, ler e editar arquivos mantendo checkpoints para desfazer alterações se necessário, além de se conectar a centenas de ferramentas do ecossistema Model Context Protocol (MCP).
3. **Seu Próprio Espaço de Trabalho (Canvas + Terminal + RAG)**: Você não precisa alternar entre múltiplos programas: crie e exporte documentos Word/PDF no Canvas, pesquise na sua base de arquivos locais via RAG sem sair do chat, e execute comandos no terminal embutido.
4. **Segurança de Nível Empresarial**: Suas chaves de API nunca ficam expostas em texto puro; elas são salvas no cofre criptografado do sistema operacional (DPAPI no Windows, Keychain no macOS).

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

- **Universal & Multi-Provider**: Connect local models (**Ollama, LM Studio, vLLM, LocalAI**) or remote APIs (**Groq, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Perplexity, OpenRouter, Together AI**) and custom OpenAI-compatible endpoints.
- **Autonomous Agent Runtime (Neo Agent)**: Formal finite state machine, reasoning streaming, file checkpoints with rollback/undo, rigorous path/process security policies, and granular approval of tool calls.
- **MCP Ecosystem (Model Context Protocol)**: Local Stdio runners (Node, Deno, Docker, NPX, UVX/Python) and remote HTTP/SSE servers with fine-grained per-tool permissions and community catalog.
- **Local Knowledge Base (RAG) & Graph**: Private incremental indexing of files (PDF, Word DOCX, Excel XLSX, Markdown, and source code) with local semantic search and interactive 2D/3D Knowledge Graph.
- **Built-in Workspace & Productivity Panels**:
  - **Canvas**: Interactive document editor with reading metrics and native export to Word (.DOCX) and PDF.
  - **Interactive Terminal**: Full multi-tab terminal sessions (PowerShell, Bash, CMD) with real-time ANSI rendering.
  - **Embedded Web Browser**: Integrated browser for quick lookups without leaving the app.
  - **Background Tasks Manager**: Live logs, duration, and process tracking for asynchronous commands.
  - **Workspace File Explorer**: Tree view of your project repository.
- **Multi-Agent Swarm**: Team collaboration across **Parallel**, **Pipeline**, and **Dialectic Debate** modes with specialized agent roles (Architect, Code Reviewer, Security Engineer, etc.).
- **Long-Term User Memory**: Automatic extraction and retention of coding guidelines, project facts, and user preferences across conversations.
- **Intelligent Provider Fallback**: Automatic ordered failover between providers if your primary API is down or rate-limited (429/5xx).
- **Multimodal, Vision & Image Generation**: Full image support, screenshot snip tool, visual analysis, and native image generation with **xAI Grok Imagine** and **OpenAI DALL-E 3**.
- **Google Workspace Connectors**: Native OAuth for Gmail, Google Calendar, and Google Drive with guarded human-in-the-loop approval.
- **Guarded Git Integration**: Inspect diffs, view status, create commits, and push changes safely from the app.
- **Voice Dictation & Push-to-Talk**: Hold `Ctrl+Alt` anywhere to speak and release to transcribe via Groq Whisper API, plus configurable Text-to-Speech (TTS).
- **OS-Native Encrypted Secret Store**: Hardware-backed credential encryption (SafeStorage / DPAPI / Keychain / Secret Service).
- **Workflows & Schedules (Cron)**: Reusable multi-step automated workflows with cron recurrence triggers.
- **Observability & Budget Tracking**: Monitor token consumption, estimated costs, monthly budget limits, and JSON/CSV reports.
- **Creative Labs & Modules**: AI Arena (side-by-side model comparison and debates), Live Sandbox (real-time React and Tailwind CSS preview), and Podcast Studio.
- **Dual Interface Modes**: Clean **User mode** for distraction-free everyday chat and a configurable **Power user mode** for model parameters, fallbacks, MCP permissions, diagnostics, and developer tools.
- **Global Popup & Hotkeys**: Instant access via `Ctrl+G` / `Cmd+G` and `groq://` URI scheme.

## 🆚 Key Additions & Differences vs. Original Fork (`groq-desktop-beta`)

The original [`groq-desktop-beta`](https://github.com/groq/groq-desktop-beta) repository by Groq, Inc. was designed exclusively as a desktop chat client for Groq Cloud API, featuring basic chat, global hotkeys, and push-to-talk voice transcription.

**NeoChat Desktop** has evolved far beyond the original client, transforming into a **universal desktop AI workspace and autonomous agent runtime** packed with privacy, productivity, software engineering, and multi-agent coordination capabilities.

### Comparison Matrix

| Feature / Capability | Original Fork (`groq-desktop-beta`) | NeoChat Desktop (This Repository) |
| :--- | :--- | :--- |
| **Supported Cloud Providers** | Groq Cloud API only | **Universal**: Groq, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Perplexity, OpenRouter, Together AI, SambaNova, Cohere + any custom OpenAI-compatible endpoint |
| **Local Models (100% Offline & Private)** | ❌ Not supported | ✅ **Ollama, LM Studio, vLLM, and LocalAI** with automatic discovery, zero inference cost, and 100% data privacy |
| **Intelligent Provider Fallback** | ❌ None | ✅ Automatic ordered failover between providers when primary API experiences outages or rate limits (429/5xx) |
| **Autonomous Agent Runtime** | ❌ None | ✅ Complete `Neo Agent Runtime` with formal finite state machine, typed event bus, file checkpoints with undo/rollback, and path/process policies |
| **MCP (Model Context Protocol)** | ❌ None | ✅ Local Stdio runners (Node, NPX, UVX/Python, Deno, Docker) and remote HTTP/SSE servers, plus MCP Hub catalog and fine-grained permissions |
| **Local Knowledge Base (RAG)** | ❌ None | ✅ Private incremental indexing of PDFs, Word (.docx), Excel (.xlsx), Markdown, and source code, with local semantic search and interactive 2D/3D Knowledge Graph |
| **Productivity Workspace & Canvas** | ❌ None | ✅ Interactive document editor with reading metrics, surgical line diff editing, and native export to Word (.DOCX) and PDF |
| **Interactive Embedded Terminal** | ❌ None | ✅ Integrated multi-tab terminal (PowerShell, Bash, CMD) with real-time ANSI streaming |
| **Embedded Web Browser** | ❌ None | ✅ Isolated built-in browser for instant web searches without leaving the application |
| **Multi-Agent Swarm** | ❌ None | ✅ Team collaboration in Parallel, Pipeline, and Debate modes with specialized agent personas (Architect, Code Reviewer, Security Engineer, etc.) |
| **Long-Term Memory** | ❌ None | ✅ Automatic continuous extraction and persistence of preferences, project context, and coding standards across chat sessions |
| **Secure Credential Vault** | Plain/basic storage | ✅ Hardware-backed OS-native encrypted store (`safeStorage` / DPAPI / Keychain / Secret Service) |
| **Guarded Git Integration** | ❌ None | ✅ Inspect repository status, view diffs, create commits, and push changes safely from the app |
| **Google Workspace Connectors** | ❌ None | ✅ Native OAuth integration for Gmail, Google Calendar, and Google Drive with guarded human approval (*human-in-the-loop*) |
| **AI Image Generation** | ❌ None | ✅ Integrated image generation via **xAI Grok Imagine** and **OpenAI DALL-E 3** with custom aspect ratios and chat preview gallery |
| **Automation & Cron Scheduler** | ❌ None | ✅ Multi-step automated workflows with cron recurrence triggers |
| **Observability & Budget Tracking** | ❌ None | ✅ Real-time token tracking, estimated cost breakdown, monthly budget caps, and JSON/CSV reports |
| **Dual Interface Modes** | Single fixed UI | ✅ **User Mode** (distraction-free everyday chat) and **Power User Mode** (advanced controls for developers) |
| **Creative Labs & Sandbox** | ❌ None | ✅ AI Arena (side-by-side model comparison & debate), Live Sandbox (real-time React/Tailwind preview), and Podcast Studio |
| **Advanced Chat History & Branching** | Simple linear history | ✅ Chat branching (conversation trees), Project workspaces, full-text search, and collapsible reasoning blocks (*Thinking blocks*) |

### Key Highlights

1. **Universal Model Freedom & Zero-Cost Privacy**: While the original project was locked into Groq Cloud, NeoChat Desktop lets you use any leading cloud model or run open-weights models (Llama 3, DeepSeek R1, Qwen 2.5) locally via Ollama or LM Studio with complete data privacy and zero API costs.
2. **Autonomous Agent & Tool Execution**: NeoChat Desktop isn't just a text wrapper. Its autonomous agent runtime can safely explore project files, run terminal commands, execute code, apply reversible file edits, and leverage hundreds of community Model Context Protocol (MCP) servers.
3. **All-in-One Productivity Hub**: Edit and export documents to Word/PDF directly in Canvas, chat with your local documents using private RAG, run shell commands in the embedded terminal, and browse the web without tab-switching.
4. **Hardware-Backed Security**: Sensitive API keys and tokens are never stored in plaintext — they are encrypted using operating system secure storage (DPAPI on Windows, Keychain on macOS).

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
