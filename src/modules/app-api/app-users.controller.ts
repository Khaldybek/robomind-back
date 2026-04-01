import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AppStudentService } from './app-student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';
import { PatchAppUserDto } from './dto/patch-app-user.dto';

@Controller('app/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppUsersController {
  constructor(private readonly app: AppStudentService) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.app.getMe(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() body: PatchAppUserDto) {
    return this.app.patchMe(userId, body);
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
