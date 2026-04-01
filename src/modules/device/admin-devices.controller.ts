import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
  UnauthorizedException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/enums';
import { DeviceLimitService } from './device-limit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
export class AdminDevicesController {
  constructor(
    private readonly deviceLimit: DeviceLimitService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  private async adminOrThrow(adminId: string): Promise<User> {
    const admin = await this.users.findOne({ where: { id: adminId } });
    if (!admin?.isActive) {
      throw new UnauthorizedException();
    }
    if (
      admin.role !== UserRole.SUPER_ADMIN &&
      admin.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException('Только для администраторов');
    }
    return admin;
  }

  /** Нарушения лимита устройств (супер-админ — все; школа — только свои ученики) */
  @Get('device-violations')
  async violations(@CurrentUser() jwt: AuthUserPayload) {
    const admin = await this.adminOrThrow(jwt.id);
    const list = await this.deviceLimit.listViolationsForAdmin(admin);
    return list.map((v) => ({
      id: v.id,
      createdAt: v.createdAt,
      attemptedDeviceId: v.attemptedDeviceId,
      userAgent: v.userAgent,
      ip: v.ip,
      student: v.user
        ? {
            id: v.user.id,
            email: v.user.email,
            firstName: v.user.firstName,
            lastName: v.user.lastName,
            schoolId: v.user.schoolId,
          }
        : null,
    }));
  }

  /** Уведомления для текущего админа (в т.ч. о лимите устройств) */
  @Get('notifications')
  async notifications(
    @CurrentUser() jwt: AuthUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const admin = await this.adminOrThrow(jwt.id);
    return this.deviceLimit.listAdminNotifications(
      admin.id,
      unreadOnly === '1' || unreadOnly === 'true',
    );
  }

  @Patch('notifications/read-all')
  async markAllRead(@CurrentUser() jwt: AuthUserPayload) {
    const admin = await this.adminOrThrow(jwt.id);
    return this.deviceLimit.markAllAdminNotificationsRead(admin.id);
  }

  @Patch('notifications/:id/read')
  async markRead(
    @CurrentUser() jwt: AuthUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const admin = await this.adminOrThrow(jwt.id);
    await this.deviceLimit.markAdminNotificationRead(id, admin.id);
    return { ok: true };
  }

  /** Устройства ученика */
  @Get('users/:userId/devices')
  async listStudentDevices(
    @CurrentUser() jwt: AuthUserPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const admin = await this.adminOrThrow(jwt.id);
    const student = await this.users.findOne({ where: { id: userId } });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Пользователь не найден или не ученик');
    }
    if (
      admin.role === UserRole.SCHOOL_ADMIN &&
      student.schoolId !== admin.schoolId
    ) {
      throw new ForbiddenException('Нет доступа к этому ученику');
    }
    return this.deviceLimit.listDevicesForUser(userId);
  }

  /** Снять устройство — ученик сможет войти с нового */
  @Delete('users/:userId/devices/:deviceId')
  async removeDevice(
    @CurrentUser() jwt: AuthUserPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const admin = await this.adminOrThrow(jwt.id);
    const student = await this.users.findOne({ where: { id: userId } });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Пользователь не найден или не ученик');
    }
    if (
      admin.role === UserRole.SCHOOL_ADMIN &&
      student.schoolId !== admin.schoolId
    ) {
      throw new ForbiddenException('Нет доступа к этому ученику');
    }
    const normalized = deviceId.trim().slice(0, 64);
    if (!normalized) {
      throw new ForbiddenException('deviceId пустой');
    }
    await this.deviceLimit.removeDeviceForUser(userId, normalized);
    return { ok: true };
  }
}
