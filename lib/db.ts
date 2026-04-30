import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const isProd = process.env.NODE_ENV === 'production';
    const forceSsl =
      process.env.DATABASE_SSL === 'true' ||
      process.env.PGSSLMODE === 'require' ||
      (connectionString?.toLowerCase().includes('sslmode=require') ?? false);

    globalThis.__pgPool = new Pool({
      connectionString,
      // En serverless (Vercel), un gros pool peut saturer Postgres très vite.
      // On garde un pool minuscule en prod, plus large en dev local.
      max: isProd ? 3 : 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: forceSsl ? { rejectUnauthorized: false } : undefined,
    });

    globalThis.__pgPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return globalThis.__pgPool;
}

export async function closePool(): Promise<void> {
  if (globalThis.__pgPool) {
    await globalThis.__pgPool.end();
    globalThis.__pgPool = undefined;
  }
}

