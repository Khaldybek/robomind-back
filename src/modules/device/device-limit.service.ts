import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { DeviceAccessViolation } from '../../database/entities/device-access-violation.entity';
import { AdminNotification } from '../../database/entities/admin-notification.entity';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/enums';

export type DeviceClientMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

export type RegisterDeviceResult =
  | { allowed: true }
  | {
      allowed: false;
      code: 'DEVICE_LIMIT_EXCEEDED';
      message: string;
      violationId: string;
    };

@Injectable()
export class DeviceLimitService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
    @InjectRepository(DeviceAccessViolation)
    private readonly violations: Repository<DeviceAccessViolation>,
    @InjectRepository(AdminNotification)
    private readonly notifications: Repository<AdminNotification>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  maxDevices(): number {
    return Math.max(
      1,
      parseInt(this.config.get<string>('MAX_STUDENT_DEVICES', '2'), 10) || 2,
    );
  }

  /**
   * Для ученика: не более N устройств. Новое устройство — запись в violations + уведомления админам школы и супер-админам.
   * Для school_admin / super_admin — без ограничения.
   */
  async registerOnLogin(
    user: Pick<
      User,
      'id' | 'role' | 'schoolId' | 'firstName' | 'lastName' | 'email'
    >,
    deviceIdRaw: string | undefined,
    meta: DeviceClientMeta,
  ): Promise<RegisterDeviceResult> {
    if (user.role !== UserRole.STUDENT) {
      return { allowed: true };
    }

    const deviceId = this.normalizeDeviceId(deviceIdRaw);
    const now = new Date();
    const max = this.maxDevices();

    const existing = await this.devices.findOne({
      where: { userId: user.id, deviceId },
    });
    if (existing) {
      existing.lastLoginAt = now;
      existing.userAgent = meta.userAgent ?? existing.userAgent;
      existing.ip = meta.ip ?? existing.ip;
      await this.devices.save(existing);
      return { allowed: true };
    }

    const count = await this.devices.count({ where: { userId: user.id } });
    if (count < max) {
      await this.devices.save(
        this.devices.create({
          userId: user.id,
          deviceId,
          userAgent: meta.userAgent ?? null,
          ip: meta.ip ?? null,
          lastLoginAt: now,
        }),
      );
      return { allowed: true };
    }

    const violation = await this.violations.save(
      this.violations.create({
        userId: user.id,
        attemptedDeviceId: deviceId,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      }),
    );

    const studentName = `${user.lastName} ${user.firstName}`.trim();
    const title = 'Превышен лимит устройств ученика';
    const body =
      `Ученик ${studentName} (${user.email}) попытался войти с нового устройства ` +
      `при лимите ${max} устройств. Зарегистрированные устройства не освобождены — ` +
      `вход заблокирован до удаления одного из устройств администратором или выхода с другого устройства.`;

    const metadata = {
      violationId: violation.id,
      studentUserId: user.id,
      studentEmail: user.email,
      attemptedDeviceId: deviceId,
    };

    const superAdmins = await this.users.find({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
      select: ['id'],
    });
    const recipientIds = new Set<string>();
    for (const a of superAdmins) recipientIds.add(a.id);

    if (user.schoolId) {
      const schoolAdmins = await this.users.find({
        where: {
          role: UserRole.SCHOOL_ADMIN,
          schoolId: user.schoolId,
          isActive: true,
        },
        select: ['id'],
      });
      for (const a of schoolAdmins) recipientIds.add(a.id);
    }

    const rows = [...recipientIds].map((recipientUserId) =>
      this.notifications.create({
        recipientUserId,
        type: 'device_violation',
        title,
        body,
        metadata,
      }),
    );
    if (rows.length) {
      await this.notifications.save(rows);
    }

    return {
      allowed: false,
      code: 'DEVICE_LIMIT_EXCEEDED',
      message:
        `Доступ с этого устройства запрещён: уже зарегистрировано ${max} устройств. ` +
        `Администратор школы и супер-администратор уведомлены.`,
      violationId: violation.id,
    };
  }

  normalizeDeviceId(raw: string | undefined): string {
    const s = raw?.trim() ?? '';
    if (!s || s.length > 64) {
      throw new BadRequestException(
        'Передайте стабильный deviceId (UUID) с клиента в теле входа: deviceId',
      );
    }
    return s.slice(0, 64);
  }

  /** Админ: снять привязку устройства — ученик сможет войти с нового */
  async removeDeviceForUser(
    studentUserId: string,
    deviceId: string,
  ): Promise<void> {
    await this.devices.delete({ userId: studentUserId, deviceId });
  }

  async listDevicesForUser(studentUserId: string): Promise<UserDevice[]> {
    return this.devices.find({
      where: { userId: studentUserId },
      order: { lastLoginAt: 'DESC' },
    });
  }

  async listViolationsForAdmin(
    admin: Pick<User, 'role' | 'schoolId'>,
  ): Promise<DeviceAccessViolation[]> {
    const qb = this.violations
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.user', 'u')
      .orderBy('v.createdAt', 'DESC')
      .take(200);

    if (admin.role === UserRole.SCHOOL_ADMIN && admin.schoolId) {
      qb.andWhere('u.school_id = :sid', { sid: admin.schoolId });
    } else if (admin.role !== UserRole.SUPER_ADMIN) {
      return [];
    }

    return qb.getMany();
  }

  async listAdminNotifications(
    recipientUserId: string,
    unreadOnly?: boolean,
  ): Promise<AdminNotification[]> {
    return this.notifications.find({
      where: {
        recipientUserId,
        ...(unreadOnly ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAdminNotificationRead(
    notificationId: string,
    recipientUserId: string,
  ): Promise<void> {
    const res = await this.notifications.update(
      { id: notificationId, recipientUserId },
      { readAt: new Date() },
    );
    if (!res.affected) {
      throw new NotFoundException('Уведомление не найдено');
    }
  }

  /** Пометить все непрочитанные уведомления адреса как прочитанные */
  async markAllAdminNotificationsRead(
    recipientUserId: string,
  ): Promise<{ updated: number }> {
    const res = await this.notifications
      .createQueryBuilder()
      .update()
      .set({ readAt: () => 'NOW()' })
      .where('recipient_user_id = :rid', { rid: recipientUserId })
      .andWhere('read_at IS NULL')
      .execute();
    return { updated: res.affected ?? 0 };
  }
}
