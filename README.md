# NeoChat Desktop

NeoChat Desktop features MCP server support for all function calling capable models hosted on Groq. Now available for Windows, macOS, and Linux!

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
xattr -c /Applications/Groq\ Desktop.app
```

## Features

- Chat multimodal with image input, conversation branching, projects, personas, and reusable prompt templates
- Clean **User mode** for everyday chat and a configurable **Power user mode** for models, providers, MCP, diagnostics, automation, and developer tools
- Local and remote MCP servers with global, server, and per-tool permission policies
- OS-native encrypted credential vault for API keys and OAuth secrets
- Ordered provider/model fallback for OpenAI-compatible endpoints
- Incremental local knowledge base (RAG) with PDF and Office document extraction
- Reusable multi-step workflows with recurring schedules
- Versioned backup and restore that excludes credentials
- Configurable text-to-speech, including optional automatic playback
- Safe in-app update checks with stable and beta channels
- Local usage/cost observability, monthly budgets, and JSON/CSV export
- Guarded Git status, diff, commit, and push actions for power users

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

This app now supports Windows, macOS, and Linux. Here's how to test cross-platform functionality:

#### Running Cross-Platform Tests

We've added several test scripts to verify platform support:

```bash
# Run all platform tests (including Docker test for Linux)
pnpm test:platforms

# Run basic path handling test only
pnpm test:paths

# If on Windows, run the PowerShell test script
.\test-windows.ps1
```

The testing scripts will check:
- Platform detection
- Script file resolution
- Environment variable handling
- Path separators
- Command resolution

### Feature tests

The repository uses focused Node.js tests. Available scripts include:

```bash
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

## Configuration

In the settings page, add your Groq API key:

```json
{
  "GROQ_API_KEY": "your-api-key"
}
```

You can obtain a Groq API key by signing up at [https://console.groq.com](https://console.groq.com). 
