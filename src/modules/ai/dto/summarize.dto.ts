import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AiSummarizeDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MinLength(40)
  text?: string;
}
