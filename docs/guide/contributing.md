# Guia de Contribuição & Boas Práticas

Este guia detalha o fluxo de trabalho para desenvolvedores e engenheiros que desejam contribuir com o código-fonte do NeoChat Desktop.

---

## 💻 Configuração do Ambiente Local

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior.
- **pnpm**: Versão 10.x (`pnpm is canonical` — nunca utilize `npm install`).
- **Git**: Controle de versão configurado.

### Passos de Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/giseldo/neochat-desktop.git
cd neochat-desktop

# 2. Instalar dependências canônicas
pnpm install

# 3. Executar o ambiente de desenvolvimento concorrente (Vite + Electron)
pnpm dev
```

---

## 📐 Regras Arquiteturais Invioláveis

Ao submeter código para o repositório, certifique-se de respeitar os seguintes padrões:

1. **Separação de Módulos (CommonJS vs ESM):**
   - Todos os arquivos no processo principal (`electron/`) e compartilhados (`shared/`) utilizam **CommonJS** (`require` / `module.exports`).
   - Apenas os arquivos no processo de renderização (`src/renderer/`) utilizam **ESM / JSX** (`import` / `export`).

2. **Novas Chamadas de IPC:**
   - Ao adicionar um novo canal de comunicação, registre-o simultaneamente no `electron/main.js` (ou no manager correspondente) e exponha o método de forma tipada no `electron/preload.js`.
   - Nunca exponha `ipcRenderer` genérico para o renderer.

3. **Scripts de Servidores MCP:**
   - Ao adicionar um novo runtime de MCP, sempre crie as três extensões (`.cmd`, `.ps1`, `.sh`) mais a variante Linux (`-linux.sh`) dentro de `electron/scripts/` e registre em `commandResolver.js`.

4. **Documentação Local:**
   - Execute `pnpm docs:dev` para testar alterações na documentação e `pnpm docs:build` para validar a compilação do VitePress.
