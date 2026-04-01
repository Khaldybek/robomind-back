import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Query для GET /admin/schools/:schoolId/admins (schoolId в пути) */
export class ListSchoolAdminsBySchoolQueryDto {
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
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class ListSchoolAdminsQueryDto {
  @IsUUID()
  schoolId: string;

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
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSchoolAdminDto {
  @IsUUID()
  schoolId: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  patronymic?: string | null;

  /** 12 цифр (ИИН) */
  @IsString()
  @Matches(/^\d{12}$/, { message: 'iin должен быть из 12 цифр' })
  iin: string;
}

export class PatchSchoolAdminDto {
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  patronymic?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'iin должен быть из 12 цифр' })
  iin?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
