import {
  Controller,
  Get,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
  BadRequestException,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';
import { validate as uuidValidate } from 'uuid';

@Controller('app/gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class GamificationController {
  constructor(private readonly gam: GamificationService) {}

  /** Полный геймификационный профиль: XP, уровень, стрик, бейджи */
  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.gam.getProfile(userId);
  }

  /**
   * Лидерборд внутри школы или глобальный.
   * query: schoolId (опционально), limit (1–100, по умолчанию 20)
   */
  @Get('leaderboard')
  leaderboard(
    @Query('schoolId') schoolId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    if (schoolId && !uuidValidate(schoolId)) {
      throw new BadRequestException('schoolId должен быть UUID');
    }
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 100);
    return this.gam.getLeaderboard(schoolId, safeLimit);
  }

  /**
   * Позиция текущего студента в рейтинге.
   * query: schoolId (опционально — фильтрует рейтинг по школе)
   */
  @Get('my-rank')
  myRank(
    @CurrentUser('id') userId: string,
    @Query('schoolId') schoolId?: string,
  ) {
    if (schoolId && !uuidValidate(schoolId)) {
      throw new BadRequestException('schoolId должен быть UUID');
    }
    return this.gam.getMyRank(userId, schoolId);
  }
}
