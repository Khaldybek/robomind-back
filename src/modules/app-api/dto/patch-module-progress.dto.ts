import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { ProgressStatus } from '../../../database/enums';

export class PatchModuleProgressDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchedSeconds?: number;

  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  /** Если true — модуль помечается завершённым (как status: completed) */
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
