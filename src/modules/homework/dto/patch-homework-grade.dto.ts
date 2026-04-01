import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PatchHomeworkGradeDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxPoints?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  feedback?: string;
}
