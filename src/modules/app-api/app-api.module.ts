import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { LessonContent } from '../../database/entities/lesson-content.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { User } from '../../database/entities/user.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { HomeworkModule } from '../homework/homework.module';
import { AppGeoController } from './app-geo.controller';
import { AppUsersController } from './app-users.controller';
import { AppCoursesController } from './app-courses.controller';
import { AppCourseModulesController } from './app-course-modules.controller';
import { AppLessonsController } from './app-lessons.controller';
import { AppQuizController } from './app-quiz.controller';
import { AppStudentService } from './app-student.service';
import { AdminUploadService } from '../admin-api/admin-upload.service';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      City,
      District,
      School,
      Course,
      CourseModule,
      Lesson,
      LessonContent,
      CourseAccess,
      User,
      Quiz,
      QuizAttempt,
      UserProgress,
      Certificate,
    ]),
    AuthModule,
    GamificationModule,
    HomeworkModule,
    QuizModule,
  ],
  controllers: [
    AppGeoController,
    AppUsersController,
    AppCoursesController,
    AppCourseModulesController,
    AppLessonsController,
    AppQuizController,
  ],
  providers: [AppStudentService, AdminUploadService],
})
export class AppApiModule {}
