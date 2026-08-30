# Build, Empacotamento & CI/CD

O NeoChat Desktop possui uma esteira automatizada de compilação, empacotamento nativo e distribuição para todos os principais sistemas operacionais.

---

## 🏗️ Pipeline de Compilação Local

A compilação combina o bundler Vite para o frontend e o Electron Builder para o encapsulamento nativo:

```
1. pnpm build           ──► Vite compila src/renderer/ para dist/
2. pnpm build:electron  ──► electron-builder empacota electron/ + dist/ + node_modules
3. Binários Finais      ──► Gerados no diretório release/
```

---

## 📦 Configuração do `electron-builder.yml`

```yaml
appId: com.giseldo.neochat
productName: NeoChat Desktop
directories:
  output: release
  buildResources: build

win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
  icon: public/icon.ico

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  category: public.app-category.productivity
  icon: public/icon.icns

linux:
  target:
    - target: AppImage
    - target: deb
  category: Utility
  icon: public/icon.png

publish:
  provider: github
  owner: giseldo
  repo: neochat-releases
```

---

## 🚀 Fluxo de Lançamento de Releases

### ⚡ Modo Automático (Recomendado)
Você pode executar todo o ciclo de release (bump de versão, build, commit, tag, push e upload) com um único comando:

```bash
# Incrementa patch (ex: 1.4.0 -> 1.4.1) e publica
pnpm release:create

# Ou incrementa minor / major / versão específica:
pnpm release:create minor
pnpm release:create major
pnpm release:create 1.5.0

# Simulação sem alterações:
pnpm release:create patch --dry-run
```

---

### 🛠️ Modo Manual

1. Atualização de versão no `package.json` (SemVer).
2. Compilação dos binários: `pnpm dist:win` / `pnpm dist:mac` / `pnpm dist:linux`.
3. Criação de commit e tag git:
   ```bash
   git commit -am "chore(release): bump version to 1.3.0"
   git tag v1.3.0
   git push origin main && git push origin v1.3.0
   ```
4. Publicação automática dos artefatos no repositório de lançamentos `giseldo/neochat-releases` via `pnpm release:publish`.
