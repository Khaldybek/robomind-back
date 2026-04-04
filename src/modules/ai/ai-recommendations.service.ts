import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { ProgressStatus } from '../../database/enums';
import { AiFeature } from '../../database/enums';
import { OpenAiService } from './openai.service';
import { AiQuotaService } from './ai-quota.service';
import { resolveStudentAiLanguage } from './utils/student-ai-language';

export type RecommendationsPayload = {
  weakTopics: string[];
  repeatModuleIds: string[];
  suggestedMaterials: string[];
  summary: string;
};

@Injectable()
export class AiRecommendationsService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly quota: AiQuotaService,
    private readonly config: ConfigService,
    @InjectRepository(QuizAttempt)
    private readonly attemptsRepo: Repository<QuizAttempt>,
    @InjectRepository(UserProgress)
    private readonly progressRepo: Repository<UserProgress>,
  ) {}

  async forStudent(
    userId: string,
    courseId?: string,
    language?: 'ru' | 'kk',
  ): Promise<RecommendationsPayload> {
    const limit = parseInt(
      this.config.get<string>('AI_RECOMMENDATIONS_DAILY_LIMIT', '10'),
      10,
    );
    await this.quota.assertUnderLimit(userId, AiFeature.RECOMMENDATIONS, limit);

    const attempts = await this.attemptsRepo.find({
      where: { userId },
      order: { completedAt: 'DESC' },
      take: 15,
      relations: ['quiz', 'quiz.module'],
    });

    const progress = await this.progressRepo.find({
      where: courseId ? { userId, courseId } : { userId },
      relations: ['module', 'course'],
      take: 50,
    });

    const attemptSummary = attempts
      .map((a) => {
        const title = a.quiz?.module?.title ?? 'модуль';
        return `${title}: попытка, балл ${a.score}/${a.maxScore}, сдал: ${a.isPassed}`;
      })
      .join('\n');

    const progressSummary = progress
      .map(
        (p) =>
          `${p.course?.title ?? ''} / ${p.module?.title ?? ''}: ${p.status}`,
      )
      .join('\n');

    const lang = resolveStudentAiLanguage(language, this.config);

    const prompt =
      lang === 'kk'
        ? `Оқушының курстар бойынша деректері бойынша жеке ұсыныстар бер (4–7 сынып, қарапайым қазақ тілі).

Тесттер тарихы:
${attemptSummary || 'дерек жоқ'}

Модульдер прогресі:
${progressSummary || 'дерек жоқ'}

ТЕК JSON жауап бер (мәтіндер қазақ тілінде, қысқа):
{
  "weakTopics": ["тема1","тема2"],
  "repeatModuleIds": [],
  "suggestedMaterials": ["не қайталау керек"],
  "summary": "дашборд үшін 2-3 қысқа сөйлем"
}
repeatModuleIds — қайталауға UUID модульдер, білмесең [].`
        : `На основе прогресса школьника 4–7 классов по курсам дай персональные рекомендации простым языком.

История тестов:
${attemptSummary || 'нет данных'}

Прогресс модулей:
${progressSummary || 'нет данных'}

Ответь ТОЛЬКО JSON:
{
  "weakTopics": ["тема1","тема2"],
  "repeatModuleIds": [],
  "suggestedMaterials": ["краткая рекомендация что подучить"],
  "summary": "2-3 предложения для дашборда"
}
repeatModuleIds — UUID модулей для повторения, если известны из контекста, иначе [].`;

    const client = this.openAi.getClient();
    const completion = await client.chat.completions.create({
      model: this.openAi.reasoningModel(),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    const json = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    let data: RecommendationsPayload;
    try {
      data = JSON.parse(json) as RecommendationsPayload;
    } catch {
      data = {
        weakTopics: [],
        repeatModuleIds: [],
        suggestedMaterials: [],
        summary:
          lang === 'kk'
            ? 'Курс бойынша оқуды жалғастырыңыз.'
            : 'Продолжайте обучение по курсу.',
      };
    }
    data.weakTopics = Array.isArray(data.weakTopics) ? data.weakTopics : [];
    data.repeatModuleIds = Array.isArray(data.repeatModuleIds)
      ? data.repeatModuleIds
      : [];
    data.suggestedMaterials = Array.isArray(data.suggestedMaterials)
      ? data.suggestedMaterials
      : [];
    data.summary = data.summary || '';

    await this.quota.increment(userId, AiFeature.RECOMMENDATIONS);
    return data;
  }
}
