import type { ConfigService } from '@nestjs/config';

/** Тіл ответов ИИ для учеников: из тела запроса или AI_STUDENT_REPLY_LANGUAGE (kk | ru), по умолчанию kk */
export function resolveStudentAiLanguage(
  explicit: 'ru' | 'kk' | undefined,
  config: ConfigService,
): 'ru' | 'kk' {
  if (explicit) return explicit;
  const v = (config.get<string>('AI_STUDENT_REPLY_LANGUAGE') ?? 'kk')
    .trim()
    .toLowerCase();
  return v === 'ru' ? 'ru' : 'kk';
}
