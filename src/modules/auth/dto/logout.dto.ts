import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  /** Отозвать эту сессию. Без поля — тело пустое, сервер ничего не удаляет (только клиент чистит storage). */
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken?: string;
}
