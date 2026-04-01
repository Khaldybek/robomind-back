import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AiSummarizeDto {
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @IsString()
  @MinLength(40)
  text?: string;
}
