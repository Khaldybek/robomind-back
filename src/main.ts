import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';

  // Разрешённые origin из окружения
  const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
  const allowedOrigins: string[] | null =
    !corsOriginRaw || corsOriginRaw === '*'
      ? null
      : corsOriginRaw.split(',').map((o) => o.trim());

  /**
   * CORS для статических файлов (/api/v1/files/*).
   *
   * express.static монтируется напрямую на Express-app и обрабатывает запросы
   * ДО того, как NestJS выставляет свои заголовки — поэтому CORS для /files/*
   * нужно добавлять отдельным middleware перед static.
   *
   * Для видеоплееров обязательны:
   *   allowedHeaders:  Range        — <video> и hls.js делают partial-запросы
   *   exposedHeaders:  Content-Range, Accept-Ranges, Content-Length — плеер видит диапазон
   */
  app.getHttpAdapter().getInstance().use(
    '/api/v1/files',
    (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin as string | undefined;

      if (origin) {
        const allowed =
          !allowedOrigins ||                   // CORS_ORIGIN=* → любой
          allowedOrigins.includes(origin);     // или точное совпадение
        if (allowed) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
      } else if (!allowedOrigins) {
        // Запрос без Origin (прямой, curl и т.д.) при режиме «всё разрешено»
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Range, Authorization, Content-Type, Accept',
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Range, Accept-Ranges, Content-Length, Content-Type',
      );
      // Браузер кэширует результат preflight 1 час — без этого OPTIONS летит перед каждым HLS-сегментом
      res.setHeader('Access-Control-Max-Age', '3600');
      // Preflight для статики (OPTIONS)
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    },
  );

  // Раздача статических файлов: поддерживает Range-запросы из коробки
  app.getHttpAdapter().getInstance().use(
    '/api/v1/files',
    express.static(join(process.cwd(), uploadDir), {
      maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
      fallthrough: false,          // 404 вместо передачи дальше (нет двусмысленности)
      setHeaders(res, filePath) {
        // Явно разрешаем Range-запросы для всех файлов
        res.setHeader('Accept-Ranges', 'bytes');
        // Для HLS-сегментов выставляем content-type явно
        if (filePath.endsWith('.m3u8')) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        } else if (filePath.endsWith('.ts')) {
          res.setHeader('Content-Type', 'video/mp2t');
        }
      },
    }),
  );

  // NestJS CORS для /api/v1/* маршрутов (JWT-защищённые эндпоинты и загрузка файлов)
  app.enableCors({
    origin: allowedOrigins ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Range',
      'X-Requested-With',
      'Cache-Control',
      // Оставляем для совместимости, пока фронт не обновлён на JWT
      'x-user-id',
    ],
    exposedHeaders: [
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'Content-Type',
    ],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
