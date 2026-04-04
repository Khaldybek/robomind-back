import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';
import { AdminCoursesService } from './admin-courses.service';
import { AdminModulesService } from './admin-modules.service';
import { AdminCourseAccessService } from './admin-course-access.service';
import {
  CreateAdminCourseDto,
  ListAdminCoursesQueryDto,
  PatchAdminCourseDto,
} from './dto/admin-courses.dto';
import { ListModulesByCourseQueryDto } from './dto/admin-modules.dto';
import {
  GrantCourseAccessDto,
  ListCourseAccessesQueryDto,
} from './dto/admin-course-access.dto';
import { BulkGrantCourseAccessDto } from './dto/bulk-grant-course-access.dto';
import { AdminUploadService } from './admin-upload.service';

const maxCourseThumbnailBytes =
  (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25) * 1024 * 1024;

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminCoursesController {
  constructor(
    private readonly courses: AdminCoursesService,
    private readonly modules: AdminModulesService,
    private readonly courseAccess: AdminCourseAccessService,
    private readonly upload: AdminUploadService,
  ) {}

  @Get()
  list(
    @Query() q: ListAdminCoursesQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courses.listCourses(q, user);
  }

  /**
   * Создание курса: `application/json` или `multipart/form-data`.
   * Для формы: поля как в JSON + опционально файл обложки в поле `thumbnail` (image/*).
   * Если передан `thumbnail`, он сохраняется в uploads, в БД пишется `/api/v1/files/images/...`.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: maxCourseThumbnailBytes },
    }),
  )
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateAdminCourseDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Только супер-администратор может создавать курсы',
      );
    }
    const payload =
      thumbnail != null
        ? { ...dto, thumbnailUrl: this.upload.image(thumbnail).url }
        : dto;
    return this.courses.createCourse(payload);
  }

  @Get(':courseId/modules')
  listModules(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() q: ListModulesByCourseQueryDto,
  ) {
    const base = {
      courseId,
      page: q.page,
      limit: q.limit,
      search: q.search,
      sort: q.sort,
    };
    if (user.role === UserRole.SCHOOL_ADMIN) {
      return this.modules.listModules(
        { ...base, isPublished: true },
        { schoolAdminReadOnly: true },
      );
    }
    return this.modules.listModules({
      ...base,
      isPublished: q.isPublished,
    });
  }

  @Get(':courseId/accesses')
  listAccesses(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() q: ListCourseAccessesQueryDto,
  ) {
    return this.courseAccess.listAccesses(courseId, q, user);
  }

  @Post(':courseId/access/bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkGrantAccess(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: BulkGrantCourseAccessDto,
  ) {
    return this.courseAccess.bulkGrantAccess(courseId, dto, user);
  }

  @Post(':courseId/access')
  @HttpCode(HttpStatus.CREATED)
  grantAccess(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: GrantCourseAccessDto,
  ) {
    return this.courseAccess.grantAccess(courseId, dto, user);
  }

  @Delete(':courseId/access/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAccess(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.courseAccess.revokeAccess(courseId, userId, user);
  }

  @Get(':courseId/students')
  listStudents(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.courseAccess.listCourseStudents(courseId, user);
  }

  @Get(':courseId')
  getOne(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.courses.getCourse(courseId, user);
  }

  @Patch(':courseId')
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: maxCourseThumbnailBytes },
    }),
  )
  patch(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: PatchAdminCourseDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Только супер-администратор может редактировать курсы',
      );
    }
    const payload =
      thumbnail != null
        ? { ...dto, thumbnailUrl: this.upload.image(thumbnail).url }
        : dto;
    return this.courses.patchCourse(courseId, payload, user);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUserPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Только супер-администратор может удалять курсы',
      );
    }
    await this.courses.deleteCourse(courseId);
  }
}
