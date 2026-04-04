import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { validate as uuidValidate } from 'uuid';
import { AiChatService } from './ai-chat.service';
import { AiRecommendationsService } from './ai-recommendations.service';
import { AiTextGradingService } from './ai-text-grading.service';
import { AiChatDto } from './dto/chat.dto';
import { AiGradeTextDto } from './dto/grade-text.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';

@Controller('app/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppAiController {
  constructor(
    private readonly aiChat: AiChatService,
    private readonly recommendations: AiRecommendationsService,
    private readonly textGrading: AiTextGradingService,
  ) {}

  /** ИИ-ассистент по текущему модулю + история диалога */
  @Post('chat')
  async chatModule(@CurrentUser('id') userId: string, @Body() dto: AiChatDto) {
    return this.aiChat.chatCourseModule(
      userId,
      dto.moduleId,
      dto.messages,
      dto.language,
    );
  }

  /** Персональные рекомендации на дашборд */
  @Get('recommendations')
  async recommendationsRoute(
    @CurrentUser('id') userId: string,
    @Query('courseId') courseId?: string,
    @Query('language') language?: 'ru' | 'kk',
  ) {
    if (courseId && !uuidValidate(courseId)) {
      throw new BadRequestException('courseId должен быть UUID');
    }
    if (language && language !== 'ru' && language !== 'kk') {
      throw new BadRequestException('language: ru | kk');
    }
    return this.recommendations.forStudent(userId, courseId, language);
  }

  /** Проверка свободного ответа (вызывается при сдаче теста или отдельно) */
  @Post('grade-text')
  async gradeText(
    @CurrentUser('id') userId: string,
    @Body() dto: AiGradeTextDto,
  ) {
    return this.textGrading.gradeAnswer(userId, {
      questionText: dto.questionText,
      studentAnswer: dto.studentAnswer,
      referenceAnswer: dto.referenceAnswer,
      gradingRubric: dto.gradingRubric,
      language: dto.language,
    });
  }
}
