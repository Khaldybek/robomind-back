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
  moduleId?: string;

  /** Если нет moduleId — сырой текст урока */
  @IsOptional()
  @IsString()
  @MinLength(80)
  moduleText?: string;

  @IsInt()
  @Min(1)
  @Max(25)
  questionCount: number;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';
}
