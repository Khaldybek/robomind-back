import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

/**
 * Создаёт и настраивает Nest-приложение (общая часть для `main` и Vercel serverless).
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';

  const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
  const allowedOrigins: string[] | null =
    !corsOriginRaw || corsOriginRaw === '*'
      ? null
      : corsOriginRaw.split(',').map((o) => o.trim());

  app.getHttpAdapter().getInstance().use(
    '/api/v1/files',
    (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin as string | undefined;

      if (origin) {
        const allowed =
          !allowedOrigins || allowedOrigins.includes(origin);
        if (allowed) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
      } else if (!allowedOrigins) {
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
      res.setHeader('Access-Control-Max-Age', '3600');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    },
  );

  app.getHttpAdapter().getInstance().use(
    '/api/v1/files',
    express.static(join(process.cwd(), uploadDir), {
      maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
      fallthrough: false,
      setHeaders(res, filePath) {
        res.setHeader('Accept-Ranges', 'bytes');
        if (filePath.endsWith('.m3u8')) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        } else if (filePath.endsWith('.ts')) {
          res.setHeader('Content-Type', 'video/mp2t');
        }
      },
    }),
  );

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

  return app;
}
