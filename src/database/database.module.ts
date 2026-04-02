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
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
        username: config.get<string>('DB_USERNAME', 'robomind'),
        password: config.get<string>('DB_PASSWORD', 'robomind'),
        database: config.get<string>('DB_NAME', 'robomind'),
        entities,
        synchronize: config.get<string>('DB_SYNC') === 'true',
        logging: config.get<string>('TYPEORM_LOGGING') === 'true',
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
