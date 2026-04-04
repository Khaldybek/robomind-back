import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleContent } from '../../database/entities/module-content.entity';
import { ModuleContentType } from '../../database/enums';
import { AiQuizGeneratorService } from './ai-quiz-generator.service';
import { AiSummarizeService } from './ai-summarize.service';
import { AiTranscriptionService } from './ai-transcription.service';
import { AiGenerateQuizDto } from './dto/generate-quiz.dto';
import { AiSummarizeDto } from './dto/summarize.dto';
import { stripHtml } from './utils/strip-html';

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminAiController {
  constructor(
    private readonly quizGen: AiQuizGeneratorService,
    private readonly summarize: AiSummarizeService,
    private readonly transcription: AiTranscriptionService,
    @InjectRepository(ModuleContent)
    private readonly contentRepo: Repository<ModuleContent>,
  ) {}

  @Post('quiz/generate')
  async generateQuiz(@Body() dto: AiGenerateQuizDto) {
    let text = dto.moduleText?.trim() ?? '';
    if (dto.moduleId && !text) {
      const items = await this.contentRepo.find({
        where: { moduleId: dto.moduleId },
        order: { order: 'ASC' },
      });
      text = items
        .map((c) =>
          c.type === ModuleContentType.TEXT && c.content
            ? stripHtml(c.content)
            : '',
        )
        .filter(Boolean)
        .join('\n\n');
    }
    if (text.length < 80) {
      throw new BadRequestException(
        'Нужен moduleText или moduleId с текстовым контентом (мин. 80 символов)',
      );
    }
    const questions = await this.quizGen.generateFromModuleText(
      text,
      dto.questionCount,
      dto.difficulty ?? 'medium',
    );
    return { questions };
  }

  @Post('summarize')
  async summarizeModule(@Body() dto: AiSummarizeDto) {
    let full = dto.text?.trim() ?? '';
    if (dto.moduleId && !full) {
      const items = await this.contentRepo.find({
        where: { moduleId: dto.moduleId },
        order: { order: 'ASC' },
      });
      full = items
        .map((c) =>
          c.type === ModuleContentType.TEXT && c.content
            ? stripHtml(c.content)
            : '',
        )
        .filter(Boolean)
        .join('\n\n');
    }
    if (full.length < 40) {
      throw new BadRequestException(
        'Нужен text или moduleId с текстовым контентом',
      );
    }
    const summary = await this.summarize.summarizeModuleContent(full);
    return { summary };
  }

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  async transcribe(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype?: string }
      | undefined,
    @Body('language') language?: 'ru' | 'kk' | 'auto',
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл file обязателен (аудио/видео)');
    }
    const lang = language ?? 'ru';
    return this.transcription.transcribeToVtt(
      file.buffer,
      file.originalname,
      lang === 'kk' || lang === 'auto' || lang === 'ru' ? lang : 'ru',
    );
  }
}
