# NeoChat Desktop

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
   ```
   pnpm install
   ```
3. Start the development server:
   ```
   pnpm dev
   ```

## Configuration & Providers

NeoChat Desktop supports multiple provider configurations:

1. **Local Models (Ollama / LM Studio)**:
   - Ensure Ollama or LM Studio is running locally (e.g., `http://localhost:11434/v1` or `http://localhost:1234/v1`).
   - Models are automatically detected or can be configured in Settings.

2. **Cloud & Remote Providers**:
   - Add your API keys in Settings for **Groq**, **OpenAI**, **Anthropic**, **DeepSeek**, or any custom OpenAI-compatible endpoint.
   - You can also configure environment variables such as `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.

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

```
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
.\test-windows.ps1
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
