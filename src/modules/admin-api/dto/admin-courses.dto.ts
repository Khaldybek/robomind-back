import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CourseLevel } from '../../../database/enums';

/** Сортировка списка курсов (super-admin) */
export enum AdminCourseListSort {
  CREATED_AT_DESC = 'createdAt_desc',
  CREATED_AT_ASC = 'createdAt_asc',
  ORDER_ASC = 'order_asc',
  ORDER_DESC = 'order_desc',
  TITLE_ASC = 'title_asc',
  TITLE_DESC = 'title_desc',
}

export class ListAdminCoursesQueryDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsEnum(AdminCourseListSort)
  sort?: AdminCourseListSort = AdminCourseListSort.ORDER_ASC;
}

/** Для multipart/form-data строки приводятся к числам/булевым */
function toOptInt(value: unknown): number | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toOptBool(value: unknown): boolean | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export class CreateAdminCourseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsEnum(CourseLevel)
  level: CourseLevel;

  @IsOptional()
  @Transform(({ value }) => toOptBool(value))
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(1024)
  /** Если одновременно загружен файл `thumbnail`, URL из тела игнорируется */
  thumbnailUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(64)
  ageGroup?: string | null;
}

export class PatchAdminCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @Transform(({ value }) => toOptBool(value))
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(1024)
  /** Если загружен файл `thumbnail`, подставляется URL сохранённого файла */
  thumbnailUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(64)
  ageGroup?: string | null;
}
