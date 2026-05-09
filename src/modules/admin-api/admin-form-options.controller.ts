import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminFormOptionsService } from './admin-form-options.service';
import {
  FormOptionsSchoolsQueryDto,
  FormOptionsCoursesQueryDto,
  FormOptionsCourseModulesQueryDto,
  FormOptionsLessonsQueryDto,
  FormOptionsQuizzesQueryDto,
} from './dto/admin-form-options.dto';

/**
 * Компактные списки для селектов и форм супер-админа (пагинация + search).
 * Префикс: /api/v1/admin/form-options
 */
@Controller('admin/form-options')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminFormOptionsController {
  constructor(private readonly options: AdminFormOptionsService) {}

  @Get('schools')
  schools(@Query() q: FormOptionsSchoolsQueryDto) {
    return this.options.listSchools(q);
  }

  @Get('courses')
  courses(@Query() q: FormOptionsCoursesQueryDto) {
    return this.options.listCourses(q);
  }

  /** Секции курса (модули курса). Query courseId — опционально, чтобы сузить по курсу */
  @Get('course-modules')
  courseModules(@Query() q: FormOptionsCourseModulesQueryDto) {
    return this.options.listCourseModules(q);
  }

  /** Уроки. Query courseModuleId — опционально */
  @Get('lessons')
  lessons(@Query() q: FormOptionsLessonsQueryDto) {
    return this.options.listLessons(q);
  }

  @Get('quizzes')
  quizzes(@Query() q: FormOptionsQuizzesQueryDto) {
    return this.options.listQuizzes(q);
  }
}
