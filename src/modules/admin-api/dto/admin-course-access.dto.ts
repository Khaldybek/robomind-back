import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
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
}
