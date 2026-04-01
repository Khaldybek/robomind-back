import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';
import { AdminSchoolStatsService } from './admin-school-stats.service';

@Controller('admin/school')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class AdminSchoolStatsController {
  constructor(private readonly stats: AdminSchoolStatsService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthUserPayload) {
    return this.stats.summary(user.schoolId, user.id);
  }
}
