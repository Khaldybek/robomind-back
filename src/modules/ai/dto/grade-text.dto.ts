import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AiGradeTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  questionText: string;

  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  studentAnswer: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  referenceAnswer: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  gradingRubric?: string;

  /** Тілдегі кері байланыс: `kk` | `ru` (әдепкі env / kk) */
  @IsOptional()
  @IsIn(['ru', 'kk'])
  language?: 'ru' | 'kk';
}
