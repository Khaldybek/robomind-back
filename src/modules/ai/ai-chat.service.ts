import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleContent } from '../../database/entities/module-content.entity';
import { ModuleContentType } from '../../database/enums';
import { AiFeature } from '../../database/enums';
import { OpenAiService } from './openai.service';
import { AiQuotaService } from './ai-quota.service';
import { stripHtml } from './utils/strip-html';
import { resolveStudentAiLanguage } from './utils/student-ai-language';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

@Injectable()
export class AiChatService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly quota: AiQuotaService,
    private readonly config: ConfigService,
    @InjectRepository(ModuleContent)
    private readonly contentRepo: Repository<ModuleContent>,
  ) {}

  async chatCourseModule(
    userId: string,
    moduleId: string,
    messages: ChatMessage[],
    language?: 'ru' | 'kk',
  ): Promise<{ reply: string }> {
    const limit = parseInt(
      this.config.get<string>('AI_CHAT_DAILY_LIMIT', '30'),
      10,
    );
    await this.quota.assertUnderLimit(userId, AiFeature.CHAT, limit);

    const context = await this.buildModuleContext(moduleId);
    const lang = resolveStudentAiLanguage(language, this.config);
    const system: ChatMessage =
      lang === 'kk'
        ? {
            role: 'system',
            content:
              'Сен робототехника курсы бойынша ИИ-көмекшісің. Тек төмендегі модуль материалына сәйкес жауап бер. ' +
              'Сұрақ сабаққа қатысты емес болса, сыпайы түрде «бұл сабақ тақырыбына жатпайды» деп айт.\n' +
              'Оқушылар — 4–7 сынып балалары. Мынаны сақта:\n' +
              '- Барлық жауапты қазақ тілінде жаз (техникалық терминді бір рет қарапайым сөзбен түсіндіруге болады).\n' +
              '- Қысқа сөйлемдер, қарапайым сөздер, достық тон.\n' +
              '- Қазақша сұраққа қазақша, орысша сұраққа да негізінен қазақша жауап бер (4–7 сынып үшін).\n\n' +
              '--- Модуль материалы ---\n' +
              context,
          }
        : {
            role: 'system',
            content:
              'Ты ИИ-ассистент по курсу робототехники. Отвечай только в рамках материала модуля ниже. ' +
              'Если вопрос вне темы — вежливо скажи, что это не относится к уроку. ' +
              'Объясняй простым языком для учеников 4–7 классов: короткие фразы, без перегруза терминами.\n\n' +
              '--- Материал модуля ---\n' +
              context,
          };

    const client = this.openAi.getClient();
    const completion = await client.chat.completions.create({
      model: this.openAi.chatModel(),
      messages: [system, ...messages.filter((m) => m.role !== 'system')],
      max_tokens: 1024,
      temperature: 0.6,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    await this.quota.increment(userId, AiFeature.CHAT);
    return { reply };
  }

  private async buildModuleContext(moduleId: string): Promise<string> {
    const items = await this.contentRepo.find({
      where: { moduleId },
      order: { order: 'ASC' },
    });
    const parts: string[] = [];
    for (const c of items) {
      switch (c.type) {
        case ModuleContentType.TEXT:
          parts.push(c.content ? stripHtml(c.content) : '');
          break;
        case ModuleContentType.VIDEO:
          parts.push(`[Видео: ${c.title ?? 'без названия'}]`);
          break;
        case ModuleContentType.FILE:
          parts.push(`[Файл: ${c.title ?? c.fileUrl ?? ''}]`);
          break;
        case ModuleContentType.LIVESTREAM:
          parts.push(`[Прямой эфир: ${c.livestreamUrl ?? ''}]`);
          break;
        case ModuleContentType.LINK:
          parts.push(`[Ссылка: ${c.content ?? ''}]`);
          break;
        default:
          break;
      }
    }
    const text = parts.filter(Boolean).join('\n\n');
    return text.slice(0, 24_000) || '(контент модуля пуст)';
  }
}
