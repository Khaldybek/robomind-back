/**
 * Точка входа Vercel Serverless: все запросы проксируются в Nest (см. vercel.json rewrites).
 * Перед деплоем: `npm run build` — нужен `dist/bootstrap-app.js`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { INestApplication } from '@nestjs/common';

let cached: INestApplication | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createApp } = require('../dist/bootstrap-app') as {
      createApp: () => Promise<INestApplication>;
    };
    cached = await createApp();
  }
  const server = cached.getHttpAdapter().getInstance();
  return server(req, res);
}
