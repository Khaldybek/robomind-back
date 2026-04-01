import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  /**
   * Обязателен для роли student — стабильный UUID, один на установку приложения/браузера.
   * Для админов можно не передавать.
   */
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
