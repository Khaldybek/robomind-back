import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  getClient(): OpenAI {
    if (!this.client) {
      const key = this.config.get<string>('OPENAI_API_KEY');
      if (!key?.trim()) {
        throw new ServiceUnavailableException(
          'OpenAI не настроен (OPENAI_API_KEY)',
        );
      }
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  chatModel(): string {
    return this.config.get<string>('OPENAI_MODEL_CHAT', 'gpt-4o-mini');
  }

  reasoningModel(): string {
    return this.config.get<string>('OPENAI_MODEL_REASONING', 'gpt-4o-mini');
  }
}
