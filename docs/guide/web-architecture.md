# Arquitetura Web & Cloud (Next.js / Neon / Vercel)

O **NeoChat Web** expande o ecossistema NeoChat para uma abordagem **Web-First**, permitindo que qualquer usuário acesse a interface e seus recursos de IA diretamente pelo navegador através do endereço [https://neochatweb.vercel.app/](https://neochatweb.vercel.app/), sem necessidade de instalação local.

---

## 🌐 Filosofia "Web-First, Desktop-Capable"

A estratégia do NeoChat não abandona o poder do Desktop, mas cria duas camadas complementares:

```
                            Ecossistema NeoChat
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
     NeoChat Web                                         NeoChat Desktop
  (Navegador / Nuvem)                                 (Electron / Local-First)
 ─────────────────────────                           ─────────────────────────
 • Acesso instantâneo                                • Modelos locais (Ollama, LM Studio)
 • Sem instalação / Mobile-ready                     • MCP local via stdio (Node, Docker, UVX)
 • BYOK (Bring Your Own Key)                         • RAG 100% offline em arquivos locais
 • Vercel Edge / Serverless                          • Captura de tela & atalhos globais
 • Persistência Neon PostgreSQL                      • Criptografia no SafeStorage do SO
```

---

## 🏗️ Stack Tecnológica do Módulo Web

A arquitetura do NeoChat Web foi construída para **custo zero de infraestrutura** e escalabilidade elástica:

1. **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions e Edge Streaming).
2. **Interface do Usuário:** [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/).
3. **Renderização Matemática & Código:** [KaTeX](https://katex.org/) (fórmulas $\LaTeX$), [React Markdown](https://github.com/remarkjs/react-markdown), [Prism Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter).
4. **Hospedagem & CDN:** [Vercel](https://vercel.com/) (Hospedagem Serverless / Edge Functions).
5. **Banco de Dados:** [Neon Serverless PostgreSQL](https://neon.tech/) com [Drizzle ORM](https://orm.drizzle.team/).
6. **Segurança BYOK:** Criptografia simétrica AES-256-GCM para chaves e envio seguro via headers HTTPS.

---

## 🔒 Modelo BYOK (Bring Your Own Key) & Fluxo de Streaming

Para manter o projeto open source e sustentável, o usuário fornece suas próprias credenciais de API:

```
[ Usuário / Navegador ]
         │
         │ 1. Digita a mensagem + Chave BYOK no Header HTTPS (x-api-key)
         ▼
[ Vercel API Route: /api/chat ]
         │
         │ 2. Autentica e formata a requisição SSE
         ▼
[ Provedor de IA ] (Groq / OpenAI / Claude / Gemini / DeepSeek / Mistral)
         │
         │ 3. Tokens transmitidos em tempo real via Server-Sent Events (SSE)
         ▼
[ Vercel API Route: ReadableStream ]
         │
         │ 4. Streaming direto para o navegador com extração de raciocínio (<think>)
         ▼
[ Renderizador React 19 + KaTeX + Markdown ]
```

---

## 🗄️ Modelagem de Dados no Neon PostgreSQL (Drizzle ORM)

O banco de dados relacional é estruturado em `lib/db/schema.js`:

```typescript
// Usuários
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Conversas
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Nova Conversa'),
  provider: text('provider').notNull().default('groq'),
  model: text('model').notNull().default('llama-3.3-70b-versatile'),
  systemPrompt: text('system_prompt'),
  temperature: text('temperature').default('0.7'),
  pinned: boolean('pinned').default(false),
});

// Mensagens
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  reasoningContent: text('reasoning_content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 🚀 Como Executar e Fazer Deploy do NeoChat Web

Para executar localmente o módulo Web:

```bash
cd siteweb
pnpm install
pnpm dev
```

Para publicar na Vercel:

```bash
cd siteweb
npx vercel --prod
```
