import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

export type UploadedFileMeta = {
  /** Путь для вставки в блок: тот же хост что и API */
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
  storedName: string;
};

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);
const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
]);
const FILE_MIMES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/octet-stream',
]);

/** Аудио для голосовых / записей к ДЗ */
const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
]);

/**
 * Домашние задания: документы + изображения + видео + аудио (широкий whitelist).
 */
function buildHomeworkMimeSet(): Set<string> {
  const s = new Set<string>([
    ...FILE_MIMES,
    ...IMAGE_MIMES,
    ...VIDEO_MIMES,
    ...AUDIO_MIMES,
    'image/jpg',
    'image/x-png',
    'application/rtf',
    'text/rtf',
  ]);
  return s;
}

const HOMEWORK_ALLOWED_MIMES = buildHomeworkMimeSet();

function extFor(mime: string, original: string): string {
  const fromName = extname(original).toLowerCase().slice(0, 12);
  if (fromName && /^\.[a-z0-9]+$/i.test(fromName)) return fromName;
  if (mime.includes('jpeg') || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/svg+xml') return '.svg';
  if (mime === 'video/mp4') return '.mp4';
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/quicktime') return '.mov';
  if (mime === 'application/pdf') return '.pdf';
  if (mime.startsWith('audio/')) {
    if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('wav')) return '.wav';
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('mp4') || mime.includes('m4a')) return '.m4a';
    if (mime.includes('ogg')) return '.ogg';
    if (mime.includes('aac')) return '.aac';
  }
  return '';
}

@Injectable()
export class AdminUploadService {
  private readonly root: string;
  private readonly filesPrefix = '/api/v1/files';

  constructor() {
    this.root = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    for (const sub of ['images', 'videos', 'files']) {
      const p = join(this.root, sub);
      if (!existsSync(p)) mkdirSync(p, { recursive: true });
    }
  }

  private assertSize(maxMb: number, size: number) {
    const max = maxMb * 1024 * 1024;
    if (size > max) {
      throw new BadRequestException(
        `Файл больше лимита ${maxMb} МБ`,
      );
    }
  }

  buildUrl(subdir: 'images' | 'videos' | 'files', storedName: string): string {
    return `${this.filesPrefix}/${subdir}/${storedName}`;
  }

  processUpload(
    subdir: 'images' | 'videos' | 'files',
    allowed: Set<string>,
    maxMb: number,
    file: Express.Multer.File | undefined,
  ): UploadedFileMeta {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не передан (поле file)');
    }
    let mime = (file.mimetype || '').toLowerCase().trim();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!allowed.has(mime)) {
      throw new BadRequestException(
        `Недопустимый тип файла: ${mime || 'unknown'}. ` +
          `Рұқсат етілмеген файл түрі / Invalid file type.`,
      );
    }
    this.assertSize(maxMb, file.size);

    const ext = extFor(mime, file.originalname) || '.bin';
    const storedName = `${randomUUID()}${ext}`;
    const destDir = join(this.root, subdir);
    const destPath = join(destDir, storedName);

    writeFileSync(destPath, file.buffer);

    return {
      url: this.buildUrl(subdir, storedName),
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      storedName,
    };
  }

  image(file: Express.Multer.File | undefined) {
    const max = Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25;
    return this.processUpload('images', IMAGE_MIMES, max, file);
  }

  video(file: Express.Multer.File | undefined) {
    const max = Number(process.env.UPLOAD_MAX_VIDEO_MB) || 512;
    return this.processUpload('videos', VIDEO_MIMES, max, file);
  }

  document(file: Express.Multer.File | undefined) {
    const max = Number(process.env.UPLOAD_MAX_FILE_MB) || 100;
    return this.processUpload('files', FILE_MIMES, max, file);
  }

  /**
   * Сдача ДЗ учеником: изображения, PDF, Office, zip, видео, аудио.
   * Лимит — максимум из UPLOAD_MAX_FILE_MB и UPLOAD_MAX_VIDEO_MB (чтобы влезло короткое видео).
   */
  homeworkFile(file: Express.Multer.File | undefined) {
    const fileMb = Number(process.env.UPLOAD_MAX_FILE_MB) || 100;
    const videoMb = Number(process.env.UPLOAD_MAX_VIDEO_MB) || 512;
    const maxMb = Math.max(fileMb, videoMb);
    return this.processUpload(
      'files',
      HOMEWORK_ALLOWED_MIMES,
      maxMb,
      file,
    );
  }
}
