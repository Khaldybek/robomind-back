import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';
import {
  City,
  District,
  School,
  User,
  Course,
  CourseAccess,
  CourseModule,
  Lesson,
  LessonContent,
  Quiz,
  Question,
  Answer,
  QuizAttempt,
  UserProgress,
  Certificate,
  AiDailyUsage,
  UserDevice,
  DeviceAccessViolation,
  AdminNotification,
  RefreshToken,
  PasswordResetToken,
  UserGamification,
  UserBadge,
  LessonHomeworkSubmission,
} from './entities';
import { getRawPostgresDataSourceOptions } from './postgres-connection';
import { InitialSchema1742274000000 } from './migrations/1742274000000-InitialSchema';
import { AiDailyUsageAndQuestionRubric1742280000000 } from './migrations/1742280000000-AiDailyUsageAndQuestionRubric';
import { DeviceLimitAndAdminNotifications1742290000000 } from './migrations/1742290000000-DeviceLimitAndAdminNotifications';
import { RefreshTokens1742300000000 } from './migrations/1742300000000-RefreshTokens';
import { DistrictIsActive1742310000000 } from './migrations/1742310000000-DistrictIsActive';
import { PasswordResetTokens1742500000000 } from './migrations/1742500000000-PasswordResetTokens';
import { Gamification1742600000000 } from './migrations/1742600000000-Gamification';
import { ModuleHomeworkSubmissions1742700000000 } from './migrations/1742700000000-ModuleHomeworkSubmissions';
import { GamificationExpand1742800000000 } from './migrations/1742800000000-GamificationExpand';
import { CourseModulesAndLessons1742900000000 } from './migrations/1742900000000-CourseModulesAndLessons';

config({ path: join(__dirname, '../../.env') });

/** Только default export — иначе TypeORM CLI: "must contain only one export of DataSource" */
export default new DataSource({
  ...getRawPostgresDataSourceOptions(),
  entities: [
    City,
    District,
    School,
    User,
    Course,
    CourseAccess,
    CourseModule,
    Lesson,
    LessonContent,
    Quiz,
    Question,
    Answer,
    QuizAttempt,
    UserProgress,
    Certificate,
    AiDailyUsage,
    UserDevice,
    DeviceAccessViolation,
    AdminNotification,
    RefreshToken,
    PasswordResetToken,
    UserGamification,
    UserBadge,
    LessonHomeworkSubmission,
  ],
  migrations: [
    InitialSchema1742274000000,
    AiDailyUsageAndQuestionRubric1742280000000,
    DeviceLimitAndAdminNotifications1742290000000,
    RefreshTokens1742300000000,
    DistrictIsActive1742310000000,
    PasswordResetTokens1742500000000,
    Gamification1742600000000,
    ModuleHomeworkSubmissions1742700000000,
    GamificationExpand1742800000000,
    CourseModulesAndLessons1742900000000,
  ],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
