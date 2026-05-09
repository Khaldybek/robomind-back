import { BadRequestException } from '@nestjs/common';
import {
  parseQuizLang,
  pickLocalized,
  textAnswerMatchesReferences,
} from './quiz-locale.util';

describe('quiz-locale.util', () => {
  describe('parseQuizLang', () => {
    it('defaults to ru', () => {
      expect(parseQuizLang(undefined)).toBe('ru');
      expect(parseQuizLang('')).toBe('ru');
    });
    it('accepts ru and kk case-insensitive', () => {
      expect(parseQuizLang('KK')).toBe('kk');
      expect(parseQuizLang(' Ru ')).toBe('ru');
    });
    it('rejects other values', () => {
      expect(() => parseQuizLang('en')).toThrow(BadRequestException);
    });
  });

  describe('pickLocalized', () => {
    it('returns kz when lang kk and kz set', () => {
      expect(pickLocalized('ru text', 'kk text', 'kk')).toBe('kk text');
    });
    it('falls back to ru when kz empty', () => {
      expect(pickLocalized('ru text', null, 'kk')).toBe('ru text');
      expect(pickLocalized('ru text', '   ', 'kk')).toBe('ru text');
    });
    it('ignores kz when lang ru', () => {
      expect(pickLocalized('ru text', 'kk text', 'ru')).toBe('ru text');
    });
  });

  describe('textAnswerMatchesReferences', () => {
    it('matches kz reference when ru differs', () => {
      expect(
        textAnswerMatchesReferences('Жауап', 'ответ', 'Жауап'),
      ).toBe(true);
    });
    it('matches ru when kz absent', () => {
      expect(textAnswerMatchesReferences('Answer', 'Answer', null)).toBe(
        true,
      );
    });
    it('false when no references', () => {
      expect(textAnswerMatchesReferences('x', null, null)).toBe(false);
      expect(textAnswerMatchesReferences('x', '', '  ')).toBe(false);
    });
  });
});
