import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';
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
}
