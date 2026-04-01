import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppStudentService } from './app-student.service';
import { ModuleHomeworkService } from '../homework/module-homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';
import { PatchModuleProgressDto } from './dto/patch-module-progress.dto';

const HOMEWORK_MAX_BYTES =
  (Number(process.env.UPLOAD_MAX_FILE_MB) || 100) * 1024 * 1024;

@Controller('app/modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppModulesController {
  constructor(
    private readonly app: AppStudentService,
    private readonly homework: ModuleHomeworkService,
  ) {}

  @Get(':moduleId/content')
  moduleContent(
    @CurrentUser('id') userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.app.getModuleContent(userId, moduleId);
  }

  @Get(':moduleId/quiz')
  moduleQuiz(
    @CurrentUser('id') userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.app.getModuleQuiz(userId, moduleId);
  }

  @Patch(':moduleId/progress')
  patchModuleProgress(
    @CurrentUser('id') userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() body: PatchModuleProgressDto,
  ) {
    return this.app.upsertModuleProgress(userId, moduleId, body);
  }

  /** Сдача домашнего задания (файл); повторная загрузка заменяет файл и сбрасывает оценку. */
  @Post(':moduleId/homework')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: HOMEWORK_MAX_BYTES },
    }),
  )
  async submitHomework(
    @CurrentUser('id') userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('comment') comment?: string,
  ) {
    const mod = await this.app.assertModuleAccessible(userId, moduleId);
    return this.homework.submitStudent(userId, mod, file, comment);
  }

  @Get(':moduleId/homework')
  async getHomework(
    @CurrentUser('id') userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    await this.app.assertModuleAccessible(userId, moduleId);
    return this.homework.getStudentSubmission(userId, moduleId);
  }
}
