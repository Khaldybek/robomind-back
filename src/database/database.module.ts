import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  City,
  District,
  School,
  User,
  Course,
  CourseAccess,
  Module as CourseModule,
  ModuleContent,
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
  ModuleHomeworkSubmission,
  UserGamification,
  UserBadge,
} from './entities';
import { typeOrmPostgresOptionsFromConfig } from './postgres-connection';

const entities = [
  City,
  District,
  School,
  User,
  Course,
  CourseAccess,
  CourseModule,
  ModuleContent,
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
  ModuleHomeworkSubmission,
  UserGamification,
  UserBadge,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...typeOrmPostgresOptionsFromConfig(config),
        entities,
        synchronize: config.get<string>('DB_SYNC') === 'true',
        logging: config.get<string>('TYPEORM_LOGGING') === 'true',
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
