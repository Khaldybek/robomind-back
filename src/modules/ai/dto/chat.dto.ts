import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  MinLength,
} from 'class-validator';

export class AiChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(12_000)
  content: string;
}

export class AiChatDto {
  @IsUUID()
  lessonId: string;

  /**
   * Язык ответа ассистента: `kk` — қазақша (4–7 сынып, қарапайым сөздер),
   * `ru` — орысша. Әдепкі: env `AI_STUDENT_REPLY_LANGUAGE` немесе `kk`.
   */
  @IsOptional()
  @IsIn(['ru', 'kk'])
  language?: 'ru' | 'kk';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages: AiChatMessageDto[];
}

/** Прямой чат в профиле (без привязки к модулю) */
export class AiProfileChatDto {
  @IsOptional()
  @IsIn(['ru', 'kk'])
  language?: 'ru' | 'kk';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages: AiChatMessageDto[];
}

/** Чат по всему курсу (контекст всех опубликованных секций и уроков) */
export class AiCourseChatDto {
  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsIn(['ru', 'kk'])
  language?: 'ru' | 'kk';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages: AiChatMessageDto[];
}
