import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ModuleHomeworkService } from './module-homework.service';
import { ListHomeworkSubmissionsQueryDto } from './dto/list-homework-submissions.dto';
import { PatchHomeworkGradeDto } from './dto/patch-homework-grade.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
export class AdminHomeworkController {
  constructor(private readonly homework: ModuleHomeworkService) {}

  @Get('homework-submissions')
  list(
    @Query() q: ListHomeworkSubmissionsQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.homework.listSubmissions(q, user);
  }

  @Patch('homework-submissions/:submissionId')
  grade(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: PatchHomeworkGradeDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.homework.patchGrade(submissionId, dto, user);
  }

  /**
   * Журнал: ученики школы с доступом к курсу + баллы теста и домашки.
   * school_admin — школа из JWT; super_admin — обязателен query `schoolId`.
   */
  @Get('modules/:moduleId/grade-overview')
  gradeOverview(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Query('schoolId') schoolId: string | undefined,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.homework.getModuleGradeOverview(moduleId, user, schoolId);
  }
}
