import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import { ListAdminUsersQueryDto, PutAdminUserDto } from './dto/admin-users.dto';

const STUDENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(
    @Query() q: ListAdminUsersQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.users.listUsers(q, user);
  }

  /** Экспорт списка учеников школы в CSV (только school_admin) */
  @Get('export')
  @Roles(UserRole.SCHOOL_ADMIN)
  async exportCsv(
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.users.exportStudentsCsv(user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  }

  /**
   * Массовое создание учеников из Excel (.xlsx). Только school_admin; школа из JWT.
   * Поле формы: `file` — первая строка = заголовки, данные со 2-й.
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: STUDENT_IMPORT_MAX_BYTES },
    }),
  )
  async importStudents(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUserPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Загрузите файл Excel в поле multipart с именем `file`',
      );
    }
    const name = file.originalname?.toLowerCase() ?? '';
    if (!name.endsWith('.xlsx')) {
      throw new BadRequestException(
        'Ожидается файл формата .xlsx (Excel 2007 и новее)',
      );
    }
    return this.users.importStudentsFromExcel(file.buffer, user);
  }

  @Get(':userId/progress')
  userProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.users.getUserProgress(userId, user);
  }

  @Get(':userId/certificates')
  userCertificates(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.users.getUserCertificates(userId, actor);
  }

  @Get(':userId/quiz-attempts')
  userQuizAttempts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.users.getUserQuizAttempts(userId, actor);
  }

  @Get(':userId')
  getOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.users.getUser(userId, user);
  }

  @Put(':userId')
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: PutAdminUserDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.users.updateUser(userId, dto, user);
  }

  @Patch(':userId/activate')
  activate(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.users.activateUser(userId, user);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    await this.users.deleteUser(userId, user);
  }
}
