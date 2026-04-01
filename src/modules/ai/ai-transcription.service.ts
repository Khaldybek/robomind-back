import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, unlinkSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import OpenAI from 'openai';
import { OpenAiService } from './openai.service';
import { segmentsToWebVtt } from './utils/webvtt';

@Injectable()
export class AiTranscriptionService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Whisper: полный текст + WebVTT (рус / казахский по language).
   */
  async transcribeToVtt(
    buffer: Buffer,
    originalName: string,
    language: 'ru' | 'kk' | 'auto' = 'ru',
  ): Promise<{ text: string; vtt: string; language?: string }> {
    const ext = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.'))
      : '.webm';
    const safeExt = ext.match(/^\.[a-z0-9]+$/i) ? ext : '.webm';
    const tmpPath = join(tmpdir(), `whisper-${Date.now()}${safeExt}`);

    try {
      writeFileSync(tmpPath, buffer);
      const client = this.openAi.getClient();
      const file = createReadStream(tmpPath);

      const transcription = (await client.audio.transcriptions.create({
        file,
        model: this.config.get<string>('OPENAI_WHISPER_MODEL', 'whisper-1'),
        response_format: 'verbose_json',
        ...(language !== 'auto' ? { language } : {}),
      })) as OpenAI.Audio.Transcriptions.TranscriptionVerbose & {
        segments?: { start: number; end: number; text: string }[];
      };

      const text = transcription.text?.trim() ?? '';
      const segments = transcription.segments ?? [];
      const vtt =
        segments.length > 0
          ? segmentsToWebVtt(
              segments.map((s) => ({
                start: s.start,
                end: s.end,
                text: s.text,
              })),
            )
          : `WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\n${text}\n`;

      return {
        text,
        vtt,
        language: transcription.language,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transcription failed';
      throw new BadRequestException(msg);
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  }
}
