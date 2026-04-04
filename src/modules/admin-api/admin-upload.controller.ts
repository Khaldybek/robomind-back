import {
  Controller,
  Post,
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
import { AdminUploadService } from './admin-upload.service';

const maxBytesOverall =
  Math.max(
    (Number(process.env.UPLOAD_MAX_VIDEO_MB) || 512) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_FILE_MB) || 100) * 1024 * 1024,
  ) +
  1024 * 1024;

@Controller('admin/upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminUploadController {
  constructor(private readonly upload: AdminUploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxBytesOverall },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Прикрепите файл (field: file)');
    return this.upload.image(file);
  }

  @Post('video')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxBytesOverall },
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Прикрепите файл (field: file)');
    return this.upload.video(file);
  }

  @Post('file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxBytesOverall },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Прикрепите файл (field: file)');
    return this.upload.document(file);
  }
}
