import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ModuleContentType } from '../../../database/enums';

export enum AdminModuleListSort {
  ORDER_ASC = 'order_asc',
  ORDER_DESC = 'order_desc',
  TITLE_ASC = 'title_asc',
  TITLE_DESC = 'title_desc',
  CREATED_AT_ASC = 'createdAt_asc',
  CREATED_AT_DESC = 'createdAt_desc',
}

/** Query для GET /admin/courses/:courseId/modules — список секций курса */
export class ListModulesByCourseQueryDto {
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
  @IsEnum(AdminModuleListSort)
  sort?: AdminModuleListSort = AdminModuleListSort.ORDER_ASC;
}

/** Query для GET /admin/lessons — список уроков в секции */
export class ListAdminLessonsQueryDto {
  @IsUUID()
  courseModuleId: string;

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
  @IsEnum(AdminModuleListSort)
  sort?: AdminModuleListSort = AdminModuleListSort.ORDER_ASC;
}

export class ListAdminModulesQueryDto {
  @IsUUID()
  courseId: string;

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
  @IsEnum(AdminModuleListSort)
  sort?: AdminModuleListSort = AdminModuleListSort.ORDER_ASC;
}

/** Секция курса: POST /admin/courses/:courseId/modules */
export class CreateCourseModuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  unlockAfterCourseModuleId?: string | null;
}

export class PatchCourseModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  unlockAfterCourseModuleId?: string | null;
}

/** Урок: POST /admin/lessons */
export class CreateAdminLessonDto {
  @IsUUID()
  courseModuleId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  unlockAfterLessonId?: string | null;
}

export class PatchAdminLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(50000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  unlockAfterLessonId?: string | null;
}

export class CreateModuleContentDto {
  @IsEnum(ModuleContentType)
  type: ModuleContentType;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(512)
  title?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(100000)
  content?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(1024)
  fileUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(1024)
  livestreamUrl?: string | null;

  @IsOptional()
  @IsDateString()
  livestreamStartsAt?: string | null;
}

export class PatchModuleContentDto {
  @IsOptional()
  @IsEnum(ModuleContentType)
  type?: ModuleContentType;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(512)
  title?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(100000)
  content?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(1024)
  fileUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(1024)
  livestreamUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsDateString()
  livestreamStartsAt?: string | null;
}

/** multipart: поле `file` + эти поля */
export class CreateContentFromFileDto {
  @IsIn(['image', 'video', 'file'])
  type: 'image' | 'video' | 'file';

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  content?: string;
}
