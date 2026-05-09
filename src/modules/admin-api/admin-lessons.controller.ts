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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';
import { AdminLessonsService } from './admin-lessons.service';
import {
  CreateAdminLessonDto,
  CreateContentFromFileDto,
  CreateModuleContentDto,
  ListAdminLessonsQueryDto,
  PatchAdminLessonDto,
  PatchModuleContentDto,
} from './dto/admin-modules.dto';

const maxBytesContentUpload =
  Math.max(
    (Number(process.env.UPLOAD_MAX_VIDEO_MB) || 512) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_FILE_MB) || 100) * 1024 * 1024,
  ) +
  1024 * 1024;

@Controller('admin/lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminLessonsController {
  constructor(private readonly lessons: AdminLessonsService) {}

  private schoolRead(user: AuthUserPayload) {
    return user.role === UserRole.SCHOOL_ADMIN
      ? { schoolAdminReadOnly: true as const }
      : undefined;
  }

  @Get()
  list(
    @Query() q: ListAdminLessonsQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.lessons.listLessons(q, this.schoolRead(user));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateAdminLessonDto) {
    return this.lessons.createLesson(dto);
  }

  @Get(':lessonId/contents')
  listContents(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.lessons.listContents(lessonId, this.schoolRead(user));
  }

  @Post(':lessonId/contents/from-file')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxBytesContentUpload },
    }),
  )
  createContentFromFile(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateContentFromFileDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Прикрепите файл в поле file');
    }
    return this.lessons.createContentFromFile(lessonId, file, body.type, {
      title: body.title,
      order: body.order,
      content: body.content,
    });
  }

  @Post(':lessonId/contents')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  createContent(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateModuleContentDto,
  ) {
    return this.lessons.createContent(lessonId, dto);
  }

  @Post(':lessonId/content')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  createContentAlias(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateModuleContentDto,
  ) {
    return this.lessons.createContent(lessonId, dto);
  }

  @Patch(':lessonId/contents/:contentId')
  @Roles(UserRole.SUPER_ADMIN)
  patchContent(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: PatchModuleContentDto,
  ) {
    return this.lessons.patchContent(lessonId, contentId, dto);
  }

  @Delete(':lessonId/contents/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN)
  async deleteContent(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    await this.lessons.deleteContent(lessonId, contentId);
  }

  @Get(':lessonId')
  getOne(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.lessons.getLesson(lessonId, this.schoolRead(user));
  }

  @Patch(':lessonId')
  @Roles(UserRole.SUPER_ADMIN)
  patch(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: PatchAdminLessonDto,
  ) {
    return this.lessons.patchLesson(lessonId, dto);
  }

  @Delete(':lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    await this.lessons.deleteLesson(lessonId);
  }
}
