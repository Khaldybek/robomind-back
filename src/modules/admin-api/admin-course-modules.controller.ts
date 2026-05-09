import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';
import { AdminCourseModulesService } from './admin-course-modules.service';
import { PatchCourseModuleDto } from './dto/admin-modules.dto';

@Controller('admin/course-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminCourseModulesController {
  constructor(private readonly courseModules: AdminCourseModulesService) {}

  @Get(':courseModuleId')
  getOne(
    @Param('courseModuleId', ParseUUIDPipe) courseModuleId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courseModules.getOne(
      courseModuleId,
      user.role === UserRole.SCHOOL_ADMIN
        ? { schoolAdminReadOnly: true }
        : undefined,
    );
  }

  @Patch(':courseModuleId')
  @Roles(UserRole.SUPER_ADMIN)
  patch(
    @Param('courseModuleId', ParseUUIDPipe) courseModuleId: string,
    @Body() dto: PatchCourseModuleDto,
  ) {
    return this.courseModules.patch(courseModuleId, dto);
  }

  @Delete(':courseModuleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('courseModuleId', ParseUUIDPipe) courseModuleId: string) {
    await this.courseModules.remove(courseModuleId);
  }
}
