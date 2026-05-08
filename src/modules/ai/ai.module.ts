import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonContent } from '../../database/entities/lesson-content.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { AiDailyUsage } from '../../database/entities/ai-daily-usage.entity';
import { OpenAiService } from './openai.service';
import { AiQuotaService } from './ai-quota.service';
import { AiChatService } from './ai-chat.service';
import { AiQuizGeneratorService } from './ai-quiz-generator.service';
import { AiTextGradingService } from './ai-text-grading.service';
import { AiSummarizeService } from './ai-summarize.service';
import { AiRecommendationsService } from './ai-recommendations.service';
import { AiTranscriptionService } from './ai-transcription.service';
import { AppAiController } from './app-ai.controller';
import { AdminAiController } from './admin-ai.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AiDailyUsage,
      LessonContent,
      CourseModule,
      Lesson,
      QuizAttempt,
      UserProgress,
    ]),
  ],
  controllers: [AppAiController, AdminAiController],
  providers: [
    OpenAiService,
    AiQuotaService,
    AiChatService,
    AiQuizGeneratorService,
    AiTextGradingService,
    AiSummarizeService,
    AiRecommendationsService,
    AiTranscriptionService,
  ],
  exports: [
    AiChatService,
    AiQuizGeneratorService,
    AiTextGradingService,
    AiSummarizeService,
    AiRecommendationsService,
    AiTranscriptionService,
  ],
})
export class AiModule {}
