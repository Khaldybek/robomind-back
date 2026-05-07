import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AppStudentService } from './app-student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';
import { PatchAppUserDto } from './dto/patch-app-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('app/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppUsersController {
  constructor(private readonly app: AppStudentService) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.app.getMe(userId);
  }

  @Get('me/profile')
  meProfile(@CurrentUser('id') userId: string) {
    return this.app.getMeProfile(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() body: PatchAppUserDto) {
    return this.app.patchMe(userId, body);
  }

  /** Загрузка аватара файлом: multipart/form-data, поле `file` */
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize:
          (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25) * 1024 * 1024,
      },
    }),
  )
  uploadMyAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.app.uploadMyAvatar(userId, file);
  }

  @Get('me/progress')
  myProgress(@CurrentUser('id') userId: string) {
    return this.app.listMyProgress(userId);
  }

  @Get('me/certificates')
  myCertificates(@CurrentUser('id') userId: string) {
    return this.app.listMyCertificates(userId);
  }

  @Get('me/dashboard')
  dashboard(@CurrentUser('id') userId: string) {
    return this.app.getDashboard(userId);
  }
}
