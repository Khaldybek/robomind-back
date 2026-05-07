import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModuleEntity } from '../../database/entities/module.entity';
import { ModuleContent } from '../../database/entities/module-content.entity';
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
import { AppModulesController } from './app-modules.controller';
import { AppQuizController } from './app-quiz.controller';
import { AppStudentService } from './app-student.service';
import { AdminUploadService } from '../admin-api/admin-upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      City,
      District,
      School,
      Course,
      CourseModuleEntity,
      ModuleContent,
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
  ],
  controllers: [
    AppGeoController,
    AppUsersController,
    AppCoursesController,
    AppModulesController,
    AppQuizController,
  ],
  providers: [AppStudentService, AdminUploadService],
})
export class AppApiModule {}
