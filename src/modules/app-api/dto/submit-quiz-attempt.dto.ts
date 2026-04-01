import { IsObject } from 'class-validator';

/** questionId → uuid ответа (single) | массив uuid (multiple) | строка (text) */
export class SubmitQuizAttemptDto {
  @IsObject()
  answers: Record<string, unknown>;
}
