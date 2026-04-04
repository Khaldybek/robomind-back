import { Injectable } from '@nestjs/common';
import { OpenAiService } from './openai.service';

export type GeneratedQuestion = {
  text: string;
  type: 'single' | 'multiple';
  answers: { text: string; isCorrect: boolean }[];
};

@Injectable()
export class AiQuizGeneratorService {
  constructor(private readonly openAi: OpenAiService) {}

  /**
   * Генерация N вопросов с вариантами по тексту модуля (админ потом правит в редакторе).
   */
  async generateFromModuleText(
    moduleText: string,
    questionCount: number,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<GeneratedQuestion[]> {
    const client = this.openAi.getClient();
    const prompt = `На основе текста урока составь ровно ${questionCount} вопросов с вариантами ответов для школьников.
Сложность: ${difficulty}.
Для каждого вопроса: type "single" (один верный) или "multiple" (несколько верных).
Ответь ТОЛЬКО валидным JSON-массивом без markdown:
[{"text":"...","type":"single","answers":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false}]}]

Текст урока:
---
${moduleText.slice(0, 20_000)}
---`;

    const completion = await client.chat.completions.create({
      model: this.openAi.reasoningModel(),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';
    const json = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    let parsed: GeneratedQuestion[];
    try {
      parsed = JSON.parse(json) as GeneratedQuestion[];
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, questionCount)
      .filter((q) => q.text && Array.isArray(q.answers));
  }
}
