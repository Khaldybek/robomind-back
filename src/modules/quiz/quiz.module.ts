import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { UserQuizMaxAttemptOverride } from '../../database/entities/user-quiz-max-attempt-override.entity';
import { QuizAttemptLimitService } from './quiz-attempt-limit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, CourseAccess, UserQuizMaxAttemptOverride]),
  ],
  providers: [QuizAttemptLimitService],
  exports: [QuizAttemptLimitService],
})
export class QuizModule {}
