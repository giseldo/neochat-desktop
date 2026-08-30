import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Retorna null ou mock quando executando sem conexão direta configurada
    return null;
  }
  const sql = neon(connectionString);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}
