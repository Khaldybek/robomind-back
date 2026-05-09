import { BadRequestException } from '@nestjs/common';

export type QuizDisplayLang = 'ru' | 'kk';

/**
 * Query `lang` для GET квиза: `ru` | `kk`, по умолчанию `ru`.
 */
export function parseQuizLang(raw: string | undefined): QuizDisplayLang {
  if (raw == null || raw === '') return 'ru';
  const v = raw.trim().toLowerCase();
  if (v === 'ru' || v === 'kk') return v;
  throw new BadRequestException('lang: ru | kk');
}

/**
 * Казахская строка непустая — при lang=kk отдаём её, иначе русскую.
 */
export function pickLocalized(
  ru: string,
  kz: string | null | undefined,
  lang: QuizDisplayLang,
): string {
  if (lang === 'kk' && kz != null && kz.trim() !== '') return kz;
  return ru;
}

/** Текстовый вопрос: верно, если совпадает с русским или казахским эталоном (если задан). */
export function textAnswerMatchesReferences(
  raw: unknown,
  referenceRu: string | null | undefined,
  referenceKz: string | null | undefined,
): boolean {
  const text = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!text) return false;
  const ru = (referenceRu ?? '').trim();
  const kz = (referenceKz ?? '').trim();
  if (!ru && !kz) return false;
  return (
    (ru !== '' && text === ru.toLowerCase()) ||
    (kz !== '' && text === kz.toLowerCase())
  );
}
