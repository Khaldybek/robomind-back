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

@Controller('app/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppCoursesController {
  constructor(private readonly app: AppStudentService) {}

  @Get()
  listCourses(@CurrentUser('id') userId: string) {
    return this.app.listCourses(userId);
  }

  @Get(':courseId/modules')
  listModules(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.app.listModules(userId, courseId);
  }
}
