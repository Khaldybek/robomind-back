import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '../../../database/enums';

export class CreateAdminQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxAttempts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export class PatchAdminQuizDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export class AnswerInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateAdminQuestionDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(1024)
  imageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  referenceAnswer?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  gradingRubric?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers: AnswerInputDto[];
}

export class PatchAdminQuestionDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  referenceAnswer?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  gradingRubric?: string | null;
}

export class PatchAdminAnswerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  text?: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class CreateAdminAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

/** Ответ ИИ / ручной импорт вопросов в тест */
export class GeneratedAnswerInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class GeneratedQuestionInputDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsIn(['single', 'multiple'])
  type: 'single' | 'multiple';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedAnswerInputDto)
  answers: GeneratedAnswerInputDto[];
}

export class ApplyGeneratedQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedQuestionInputDto)
  questions: GeneratedQuestionInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(512)
  quizTitle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;
}
