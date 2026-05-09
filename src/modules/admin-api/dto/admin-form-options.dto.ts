import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const toBool = (value: unknown): boolean | undefined => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};

/** Общие query: страница, размер, поиск по названию */
export class FormOptionsListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 100;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class FormOptionsSchoolsQueryDto extends FormOptionsListQueryDto {
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  /** По умолчанию на бэкенде — только активные школы */
  isActive?: boolean;
}

export class FormOptionsCoursesQueryDto extends FormOptionsListQueryDto {
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  isPublished?: boolean;
}

export class FormOptionsCourseModulesQueryDto extends FormOptionsListQueryDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

export class FormOptionsLessonsQueryDto extends FormOptionsListQueryDto {
  @IsOptional()
  @IsUUID()
  courseModuleId?: string;
}

export class FormOptionsQuizzesQueryDto extends FormOptionsListQueryDto {}
