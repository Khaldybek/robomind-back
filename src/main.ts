import { NestFactory } from '@nestjs/core';
import { createApp } from './bootstrap-app';

/** Vercel ищет в `main.ts` импорт `@nestjs/*` (иначе «No entrypoint… nestjs»). */
void NestFactory;

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
