import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class AiGenerateQuizDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  /** Если нет lessonId — сырой текст урока */
  @IsOptional()
  @IsString()
  @MinLength(80)
  lessonText?: string;

  @IsInt()
  @Min(1)
  @Max(25)
  questionCount: number;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';
}
