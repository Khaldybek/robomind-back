import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterStudentDto {
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

  @IsString()
  @MaxLength(255)
  patronymic?: string;

  @IsString()
  @Matches(/^\d{12}$/, { message: 'ИИН: 12 цифр' })
  iin: string;

  @IsUUID()
  schoolId: string;

  /** Если указан — после регистрации сразу выдаётся пара токенов (как при login) */
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
