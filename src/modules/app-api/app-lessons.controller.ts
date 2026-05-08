import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppStudentService } from './app-student.service';
import { ModuleHomeworkService } from '../homework/module-homework.service';
import { PatchModuleProgressDto } from './dto/patch-module-progress.dto';

const HOMEWORK_MAX_BYTES =
  (Number(process.env.UPLOAD_MAX_FILE_MB) || 100) * 1024 * 1024;

@Controller('app/lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppLessonsController {
  constructor(
    private readonly app: AppStudentService,
    private readonly homework: ModuleHomeworkService,
  ) {}

  @Get(':lessonId/content')
  lessonContent(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.app.getLessonContent(userId, lessonId);
  }

  @Get(':lessonId/quiz')
  lessonQuiz(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.app.getLessonQuiz(userId, lessonId);
  }

  @Patch(':lessonId/progress')
  patchLessonProgress(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() body: PatchModuleProgressDto,
  ) {
    return this.app.upsertLessonProgress(userId, lessonId, body);
  }

  @Post(':lessonId/homework')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: HOMEWORK_MAX_BYTES },
    }),
  )
  async submitHomework(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('comment') comment?: string,
  ) {
    const lesson = await this.app.assertLessonAccessible(userId, lessonId);
    return this.homework.submitStudent(userId, lesson, file, comment);
  }

  @Get(':lessonId/homework')
  async getHomework(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    await this.app.assertLessonAccessible(userId, lessonId);
    return this.homework.getStudentSubmission(userId, lessonId);
  }
}
