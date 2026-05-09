import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseAccessType } from '../../../database/enums';

export class BulkGrantCourseAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  userIds: string[];

  @IsEnum(CourseAccessType)
  accessType: CourseAccessType;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  maxQuizAttempts?: number | null;
}
