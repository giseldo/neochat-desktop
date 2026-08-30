import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Tabela de Usuários (Neon Auth / Custom Auth)
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tabela de Conversas
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Nova Conversa'),
  provider: text('provider').notNull().default('groq'),
  model: text('model').notNull().default('llama-3.3-70b-versatile'),
  systemPrompt: text('system_prompt'),
  temperature: text('temperature').default('0.7'),
  pinned: boolean('pinned').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tabela de Mensagens do Chat
 */
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  tokens: integer('tokens'),
  model: text('model'),
  provider: text('provider'),
  reasoningContent: text('reasoning_content'), // Suporte a DeepSeek R1 thinking process
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Tabela de Credenciais BYOK do Usuário (Criptografadas)
 */
export const providerCredentials = pgTable('provider_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(), // 'groq', 'openai', 'anthropic', etc.
  encryptedApiKey: text('encrypted_api_key').notNull(),
  customEndpoint: text('custom_endpoint'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
