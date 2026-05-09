import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CourseAccessType } from '../../../database/enums';

export class ListCourseAccessesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class GrantCourseAccessDto {
  @IsUUID()
  userId: string;

  @IsEnum(CourseAccessType)
  accessType: CourseAccessType;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  /** Лимит попыток квизов курса для ученика (1–99); null — не задавать. */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  maxQuizAttempts?: number | null;
}

export class PatchCourseAccessDto {
  /** Обновить лимит попыток; null — снять лимит на доступе (использовать дефолт курса / квиз). */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  maxQuizAttempts?: number | null;
}
