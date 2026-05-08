import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AppStudentService } from './app-student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';

@Controller('app/course-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppCourseModulesController {
  constructor(private readonly app: AppStudentService) {}

  @Get(':courseModuleId/lessons')
  listLessons(
    @CurrentUser('id') userId: string,
    @Param('courseModuleId', ParseUUIDPipe) courseModuleId: string,
  ) {
    return this.app.listLessonsInCourseModule(userId, courseModuleId);
  }
}
