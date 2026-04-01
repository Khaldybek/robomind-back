import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '../../database/enums';
import { OpenAiService } from './openai.service';
import { AiQuotaService } from './ai-quota.service';
import { resolveStudentAiLanguage } from './utils/student-ai-language';

export type TextGradeResult = {
  score: number;
  feedback: string;
};

@Injectable()
export class AiTextGradingService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly quota: AiQuotaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Оценка свободного ответа 0–100 + обратная связь (эталон и критерии задаёт админ).
   */
  async gradeAnswer(
    userId: string,
    params: {
      questionText: string;
      studentAnswer: string;
      referenceAnswer: string;
      gradingRubric?: string | null;
      language?: 'ru' | 'kk';
    },
  ): Promise<TextGradeResult> {
    const limit = parseInt(
      this.config.get<string>('AI_TEXT_GRADE_DAILY_LIMIT', '200'),
      10,
    );
    await this.quota.assertUnderLimit(userId, AiFeature.TEXT_GRADE, limit);

    const rubric = params.gradingRubric?.trim()
      ? `\nКритерии оценки:\n${params.gradingRubric}`
      : '';

    const lang = resolveStudentAiLanguage(params.language, this.config);

    const prompt =
      lang === 'kk'
        ? `Сен 4–7 сынып оқушысының жауабын тексересің.

Сұрақ: ${params.questionText}

Эталонды жауап (бағыт):
${params.referenceAnswer}
${rubric}

Оқушының жауабы:
${params.studentAnswer}

0-ден 100-ге дейін бүтін сан score қой және кері байланысты қазақ тілінде жаз (2–4 қысқа сөз, қарапайым сөздер, достық тон).
Жауап ТЕК JSON: {"score":сан,"feedback":"..."}`
        : `Ты проверяешь ответ школьника 4–7 класса. Вопрос: ${params.questionText}

Эталонный ответ (ориентир):
${params.referenceAnswer}
${rubric}

Ответ ученика:
${params.studentAnswer}

Выставь score от 0 до 100 (целое) и краткую обратную связь на русском (2–4 коротких предложения, простые слова).
Ответь ТОЛЬКО JSON: {"score":число,"feedback":"..."}`;

    const client = this.openAi.getClient();
    const completion = await client.chat.completions.create({
      model: this.openAi.reasoningModel(),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    });

    const raw =
      completion.choices[0]?.message?.content?.trim() ?? '{"score":0,"feedback":""}';
    const json = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    let result: TextGradeResult;
    try {
      result = JSON.parse(json) as TextGradeResult;
    } catch {
      result = {
        score: 0,
        feedback:
          lang === 'kk'
            ? 'Модель жауабын өңдеу мүмкін болмады.'
            : 'Не удалось разобрать ответ модели.',
      };
    }
    result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));

    await this.quota.increment(userId, AiFeature.TEXT_GRADE);
    return result;
  }
}
