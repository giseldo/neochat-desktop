# AGENTS.md

Electron + React 19 desktop AI workspace & chat app with universal multi-provider support (Groq, OpenAI, Anthropic, DeepSeek, local Ollama/LM Studio), local RAG, image input, and local/remote MCP servers. Main process in `electron/`, renderer in `src/renderer/`, shared model config in `shared/models.js`. All CommonJS outside the renderer; only `src/renderer/` uses ESM/JSX.

## Commands

- Install: `pnpm install`. **pnpm is canonical** (`packageManager: pnpm@10.9.0`); `pnpm-lock.yaml` is the real lockfile, `package-lock.json` is stale — never use `npm install`.
- Dev: `pnpm dev` (runs Vite on :5173 + Electron concurrently). DevTools auto-opens; main window is created `fullscreen: true` (`electron/windowManager.js`).
- Build: `pnpm build` (Vite → `dist/`), `pnpm build:electron` (electron-builder), `pnpm dist` (both, output to `release/`).
- **No test framework, no typecheck, no lint script.** Verification is ad-hoc `node tests/test-*.js` scripts (`tests/test-paths.js`, `tests/test-resolver.js`, `tests/test-popup-window.js`, ...). `pnpm test` runs core tests; `pnpm test:paths` runs one; `tests/test-cross-platform.sh` requires Docker and runs Linux tests via `tests/test-linux.Dockerfile`; `tests/test-windows.ps1` for Windows. Run ESLint via `npx eslint` (flat config).
- **Workflow**: Always test/build, then `git commit` and `git push` to `origin main` automatically after implementing each requested change/feature.
- **Release Workflow**: Whenever generating a new release:
  - **Automated**: Run `pnpm release:create [patch|minor|major|<version>]` (e.g. `pnpm release:create patch`). This automatically bumps version, tags, pushes, and triggers GitHub Actions to build and publish release artifacts.
  - **Manual**:
    1. Bump version in `package.json` (e.g. semver patch/minor).
    2. Commit (`chore(release): bump version to X.Y.Z`) and create git tag `vX.Y.Z`.
    3. Push commit and tag `git push origin main && git push origin vX.Y.Z`. GitHub Actions will automatically build and publish release artifacts.

## Architecture

- `electron/main.js` is the entrypoint and wires every IPC handler. Features live in focused managers: `settingsManager`, `mcpManager`, `chatHandler`, `toolHandler`, `authManager`, `googleOAuthManager`, `contextCapture`, `popupWindow`, `chatHistoryManager`, `commandResolver`, `windowManager`.
- **Neo Agent Runtime (`electron/agent/`)**: Autonomous agent harness with formal state machine (`agentLoop.js`), typed event bus (`eventBus.js`), multi-provider model routing (`modelRouter.js`), unified tool catalog & executor (`toolRegistry.js`, `toolExecutor.js`), workspace intelligence (`workspaceManager.js`), persistent shell session manager (`shellManager.js`), file checkpoints & undo (`checkpoints.js`), permission engine (`permissionEngine.js`), and context compaction (`compactionManager.js`).
- Renderer → main only through the `window.electron` bridge in `electron/preload.js` (`contextIsolation: true`, `nodeIntegration: false`). New IPC must be added in both `main.js` (or a manager) and `preload.js`.
- Chat streaming is push-based over IPC channels. `preload.js` `startChatStream()` calls `cleanupChatStreamListeners()` before registering listeners to prevent duplicate responses on HMR — preserve that behavior.
- Settings persist to `app.getPath('userData')/settings.json` (outside the repo). `settingsManager.js` merges defaults. Provider keys are stored through the settings API. Placeholder for "not set" is `"<replace me>"`.
- `shared/models.js` fetches models from the Groq API (5-min cache) and infers capabilities by name heuristics (`gpt-oss` → builtin tools, `llama-4` → vision); custom models from settings merge in `getModelContextSizes()`.
- Local MCP servers launch via per-platform stdio scripts in `electron/scripts/` — `run-{node,npm,deno,docker,npx,uvx}.{cmd,ps1,sh}`, with `-linux.sh` variants. When adding a runtime, add all three extensions plus the Linux variant and wire it in `commandResolver.js`.

## Gotchas

- `.npmrc` sets `node-linker=hoisted` — electron-builder requires this; don't remove.
- pnpm blocks postinstall build scripts by default. `pnpm-workspace.yaml` `onlyBuiltDependencies` lists `electron`/`esbuild`. After a clean `pnpm install`, if "Electron failed to install correctly" appears, run `pnpm approve-builds`.
- **`electron-builder.yml` is the primary build configuration.**
- `electron-builder.yml` `publish` targets `giseldo/neochat-desktop`.
- CI: `build-macos.yml` builds on pushes to `main` (`pnpm dist`), creates a GitHub release, and updates a Homebrew cask. `code-freeze-bypass.yaml` is Terraform-managed — do not edit.
- The `groq://` URL protocol and global hotkey (Ctrl+G / Cmd+G) capture context into the renderer; `popupEnabled:false` in settings routes captured context to the main window instead of the popup.
