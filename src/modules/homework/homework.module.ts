import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonHomeworkSubmission } from '../../database/entities/lesson-homework-submission.entity';
import { Course } from '../../database/entities/course.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AdminUploadService } from '../admin-api/admin-upload.service';
import { ModuleHomeworkService } from './module-homework.service';
import { AdminHomeworkController } from './admin-homework.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonHomeworkSubmission,
      Course,
      Lesson,
      CourseAccess,
      Quiz,
      QuizAttempt,
      User,
    ]),
    AuthModule,
    GamificationModule,
  ],
  controllers: [AdminHomeworkController],
  providers: [ModuleHomeworkService, AdminUploadService],
  exports: [ModuleHomeworkService],
})
export class HomeworkModule {}
