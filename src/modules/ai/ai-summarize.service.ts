import { Injectable } from '@nestjs/common';
import { OpenAiService } from './openai.service';

@Injectable()
export class AiSummarizeService {
  constructor(private readonly openAi: OpenAiService) {}

  /** 3–5 предложений: «что узнаю» для каталога / страницы модуля */
  async summarizeModuleContent(fullText: string): Promise<string> {
    const client = this.openAi.getClient();
    const completion = await client.chat.completions.create({
      model: this.openAi.chatModel(),
      messages: [
        {
          role: 'user',
          content: `Кратко (3–5 предложений на русском) опиши, чему научится школьник по этому уроку. Без списков, связный текст для блока «Что я узнаю»:\n\n${fullText.slice(0, 16_000)}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.4,
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  }
}
