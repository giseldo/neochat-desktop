# NeoChat Web 🌐

> **NeoChat Web** é a versão Web-First, universal e independente do ecossistema **NeoChat**, construída com **Next.js 15**, **React 19**, **Tailwind CSS**, suporte a **Neon PostgreSQL (Drizzle ORM)** e arquitetura **BYOK (Bring Your Own Key)**.

Publicado em: [https://neochatweb.vercel.app/](https://neochatweb.vercel.app/)

---

## 🚀 Recursos Principais

- **Multi-Provedor Universal:** Conexão nativa com **Groq**, **OpenAI**, **Anthropic (Claude 3.7)**, **Google Gemini**, **DeepSeek (V3/R1)**, **Mistral** e **OpenRouter**.
- **100% BYOK (Bring Your Own Key):** O usuário informa sua própria chave de API. As credenciais são criptografadas e enviadas apenas durante as inferências via HTTPS.
- **Streaming em Tempo Real:** Endpoint `/api/chat` com SSE (Server-Sent Events) de baixa latência e suporte a reasoning/thinking collapsible accordion.
- **Renderização Rica:** Markdown com realce de sintaxe em blocos de código e fórmulas matemáticas completas com **KaTeX** ($...$ e $$...$$).
- **Templates & Personas:** Modos especializados pré-configurados (Arquiteto de Software, Debugger, LaTeX Math Tutor, Clean Code, Revisor Acadêmico).
- **Pronto para Neon PostgreSQL:** Schemas completos com **Drizzle ORM** para persistência de histórico e credenciais na nuvem.

---

## 🛠️ Instalação e Execução Local

```bash
# 1. Entre na pasta do módulo web
cd siteweb

# 2. Instale as dependências (pnpm recomendado)
pnpm install

# 3. Inicie o servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## ☁️ Deploy na Vercel

### Opção 1: Via Vercel CLI

```bash
cd siteweb
npx vercel --prod
```

### Opção 2: Via Git & Painel Vercel

1. Crie um novo projeto no [Vercel Dashboard](https://vercel.com/new).
2. Conecte seu repositório GitHub.
3. Configure o **Root Directory** como `siteweb`.
4. (Opcional) Configure as variáveis de ambiente:
   - `DATABASE_URL` (Sua string de conexão do Neon PostgreSQL)
   - `ENCRYPTION_SECRET` (Chave secreta para criptografia AES de credenciais)
5. Clique em **Deploy**.

---

## 🗄️ Estrutura de Arquivos

```
siteweb/
├── app/
│   ├── api/
│   │   ├── chat/route.js      # Streaming serverless multi-provider
│   │   └── models/route.js    # Catálogo de modelos
│   ├── globals.css            # Estilos Tailwind e KaTeX
│   ├── layout.jsx             # Layout raiz Next.js
│   └── page.jsx               # Aplicação de Chat Web
├── components/
│   ├── ChatInput.jsx          # Input com auto-resize e atalhos
│   ├── Header.jsx             # Barra de navegação e status BYOK
│   ├── MessageItem.jsx        # Renderizador de mensagens, Markdown e LaTeX
│   ├── ModelSelector.jsx      # Seletor dinâmico de modelos/provedores
│   ├── PromptTemplatesModal.jsx # Modais de personas especialistas
│   ├── SettingsModal.jsx      # Gerenciador de chaves BYOK
│   └── Sidebar.jsx            # Histórico de conversas
├── lib/
│   ├── crypto.js              # Criptografia AES-256-GCM
│   ├── providers.js           # Catálogo e endpoints de provedores
│   └── db/
│       ├── index.js           # Conexão Neon Serverless
│       └── schema.js          # Schemas Drizzle ORM
├── package.json
├── tailwind.config.js
└── vercel.json
```

---

## 📄 Licença

Distribuído sob a licença ISC. Desenvolvido pela equipe NeoChat.
