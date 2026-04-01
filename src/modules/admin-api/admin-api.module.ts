import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModuleEntity } from '../../database/entities/module.entity';
import { ModuleContent } from '../../database/entities/module-content.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { Question } from '../../database/entities/question.entity';
import { Answer } from '../../database/entities/answer.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { DeviceAccessViolation } from '../../database/entities/device-access-violation.entity';
import { AdminNotification } from '../../database/entities/admin-notification.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminGeoController } from './admin-geo.controller';
import { AdminGeoService } from './admin-geo.service';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { AdminModulesController } from './admin-modules.controller';
import { AdminModulesService } from './admin-modules.service';
import { AdminUploadController } from './admin-upload.controller';
import { AdminUploadService } from './admin-upload.service';
import { AdminSchoolAdminsController } from './admin-school-admins.controller';
import { AdminSchoolAdminsService } from './admin-school-admins.service';
import { AdminUsersService } from './admin-users.service';
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
      CourseModuleEntity,
      ModuleContent,
      UserProgress,
      Certificate,
      CourseAccess,
      Quiz,
      Question,
      Answer,
      QuizAttempt,
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
    AdminModulesController,
    AdminUploadController,
    AdminSchoolAdminsController,
    AdminQuizController,
    AdminCertificatesController,
    AdminStatsController,
    AdminMySchoolController,
    AdminSchoolStatsController,
    AdminMeController,
  ],
  providers: [
    AdminGeoService,
    AdminCoursesService,
    AdminModulesService,
    AdminUploadService,
    AdminSchoolAdminsService,
    AdminUsersService,
    AdminCourseAccessService,
    AdminQuizService,
    AdminCertificatesService,
    AdminStatsService,
    AdminSchoolStatsService,
  ],
})
export class AdminApiModule {}
