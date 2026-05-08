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
import { AdminCourseModulesService } from './admin-course-modules.service';
import { PatchCourseModuleDto } from './dto/admin-modules.dto';

@Controller('admin/course-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminCourseModulesController {
  constructor(private readonly courseModules: AdminCourseModulesService) {}

  @Get(':courseModuleId')
  getOne(@Param('courseModuleId', ParseUUIDPipe) courseModuleId: string) {
    return this.courseModules.getOne(courseModuleId);
  }

  @Patch(':courseModuleId')
  patch(
    @Param('courseModuleId', ParseUUIDPipe) courseModuleId: string,
    @Body() dto: PatchCourseModuleDto,
  ) {
    return this.courseModules.patch(courseModuleId, dto);
  }

  @Delete(':courseModuleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('courseModuleId', ParseUUIDPipe) courseModuleId: string) {
    await this.courseModules.remove(courseModuleId);
  }
}
