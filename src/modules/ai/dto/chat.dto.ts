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
  moduleId: string;

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
