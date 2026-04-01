import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatchAppUserDto {
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
  patronymic?: string;

  /** URL аватара или пустая строка для сброса */
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  avatarUrl?: string | null;
}
