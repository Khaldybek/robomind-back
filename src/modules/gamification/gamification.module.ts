import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGamification } from '../../database/entities/user-gamification.entity';
import { UserBadge } from '../../database/entities/user-badge.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { User } from '../../database/entities/user.entity';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserGamification,
      UserBadge,
      UserProgress,
      QuizAttempt,
      Certificate,
      User,
    ]),
    AuthModule,
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
