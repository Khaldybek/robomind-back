import { Controller, Get, ForbiddenException, UseGuards } from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';
import { AdminGeoService } from './admin-geo.service';

/** Карточка своей школы для администратора школы */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class AdminMySchoolController {
  constructor(private readonly geo: AdminGeoService) {}

  @Get('my-school')
  getMySchool(@CurrentUser() user: AuthUserPayload) {
    if (!user.schoolId) {
      throw new ForbiddenException('У администратора не задана школа (schoolId)');
    }
    return this.geo.getSchoolProfileForSchoolAdmin(user.schoolId);
  }
}
