import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { LessonContent } from '../../database/entities/lesson-content.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { Question } from '../../database/entities/question.entity';
import { Answer } from '../../database/entities/answer.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserQuizMaxAttemptOverride } from '../../database/entities/user-quiz-max-attempt-override.entity';
import { DeviceAccessViolation } from '../../database/entities/device-access-violation.entity';
import { AdminNotification } from '../../database/entities/admin-notification.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminGeoController } from './admin-geo.controller';
import { AdminGeoService } from './admin-geo.service';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { AdminCourseModulesController } from './admin-course-modules.controller';
import { AdminCourseModulesService } from './admin-course-modules.service';
import { AdminLessonsController } from './admin-lessons.controller';
import { AdminLessonsService } from './admin-lessons.service';
import { AdminUploadController } from './admin-upload.controller';
import { AdminUploadService } from './admin-upload.service';
import { AdminSchoolAdminsController } from './admin-school-admins.controller';
import { AdminSchoolAdminsService } from './admin-school-admins.service';
import { AdminUsersService } from './admin-users.service';
import { AdminQuizAttemptLimitsService } from './admin-quiz-attempt-limits.service';
import { AdminCourseAccessService } from './admin-course-access.service';
import { AdminQuizController } from './admin-quiz.controller';
import { AdminQuizService } from './admin-quiz.service';
import { AdminCertificatesController } from './admin-certificates.controller';
import { AdminCertificatesService } from './admin-certificates.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminMySchoolController } from './admin-my-school.controller';
import { AdminSchoolStatsController } from './admin-school-stats.controller';
import { AdminSchoolStatsService } from './admin-school-stats.service';
import { AdminMeController } from './admin-me.controller';
import { AdminFormOptionsController } from './admin-form-options.controller';
import { AdminFormOptionsService } from './admin-form-options.service';
import { HomeworkModule } from '../homework/homework.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      City,
      District,
      School,
      User,
      Course,
      CourseModule,
      Lesson,
      LessonContent,
      UserProgress,
      Certificate,
      CourseAccess,
      Quiz,
      Question,
      Answer,
      QuizAttempt,
      UserQuizMaxAttemptOverride,
      DeviceAccessViolation,
      AdminNotification,
    ]),
    AuthModule,
    HomeworkModule,
    GamificationModule,
  ],
  controllers: [
    AdminUsersController,
    AdminGeoController,
    AdminCoursesController,
    AdminCourseModulesController,
    AdminLessonsController,
    AdminUploadController,
    AdminSchoolAdminsController,
    AdminQuizController,
    AdminCertificatesController,
    AdminStatsController,
    AdminMySchoolController,
    AdminSchoolStatsController,
    AdminMeController,
    AdminFormOptionsController,
  ],
  providers: [
    AdminGeoService,
    AdminCoursesService,
    AdminCourseModulesService,
    AdminLessonsService,
    AdminUploadService,
    AdminSchoolAdminsService,
    AdminUsersService,
    AdminQuizAttemptLimitsService,
    AdminCourseAccessService,
    AdminQuizService,
    AdminCertificatesService,
    AdminStatsService,
    AdminSchoolStatsService,
    AdminFormOptionsService,
  ],
})
export class AdminApiModule {}
