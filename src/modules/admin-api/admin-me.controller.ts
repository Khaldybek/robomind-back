import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../database/enums';
import { User } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../auth/decorators/current-user.decorator';

/** Текущий администратор (JWT) — полный профиль из БД */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminMeController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @Get('me')
  async me(@CurrentUser() jwt: AuthUserPayload) {
    const u = await this.users.findOne({
      where: { id: jwt.id },
      relations: { school: true },
    });
    if (!u) throw new NotFoundException('Пользователь не найден');
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      patronymic: u.patronymic,
      iin: u.iin,
      role: u.role,
      isActive: u.isActive,
      schoolId: u.schoolId,
      school: u.school
        ? {
            id: u.school.id,
            name: u.school.name,
            number: u.school.number,
            districtId: u.school.districtId,
          }
        : null,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}
