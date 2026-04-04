import type { ConfigService } from '@nestjs/config';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/** SSL для облачных Postgres (Neon, Supabase, Vercel Postgres и т.д.) */
function sslFromEnv():
  | boolean
  | { rejectUnauthorized: boolean }
  | undefined {
  if (process.env.DB_SSL !== 'true') return undefined;
  return { rejectUnauthorized: false };
}

/**
 * Часть опций подключения для TypeORM CLI / DataSource (без entities/migrations).
 * Приоритет: `DATABASE_URL` или `DB_URL`, иначе `DB_HOST`, `DB_PORT`, …
 */
export function getRawPostgresDataSourceOptions(): PostgresConnectionOptions {
  const url =
    process.env.DATABASE_URL?.trim() || process.env.DB_URL?.trim() || undefined;
  const ssl = sslFromEnv();
  if (url) {
    return { type: 'postgres', url, ssl };
  }
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'robomind',
    password: process.env.DB_PASSWORD ?? 'robomind',
    database: process.env.DB_NAME ?? 'robomind',
    ssl,
  };
}

function sslFromConfig(config: ConfigService) {
  return config.get<string>('DB_SSL') === 'true'
    ? { rejectUnauthorized: false }
    : undefined;
}

/**
 * Опции для `TypeOrmModule.forRootAsync` (Nest).
 */
export function typeOrmPostgresOptionsFromConfig(
  config: ConfigService,
): PostgresConnectionOptions {
  const url =
    config.get<string>('DATABASE_URL')?.trim() ||
    config.get<string>('DB_URL')?.trim() ||
    undefined;
  const ssl = sslFromConfig(config);
  if (url) {
    return {
      type: 'postgres',
      url,
      ssl,
    };
  }
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
    username: config.get<string>('DB_USERNAME', 'robomind'),
    password: config.get<string>('DB_PASSWORD', 'robomind'),
    database: config.get<string>('DB_NAME', 'robomind'),
    ssl,
  };
}
