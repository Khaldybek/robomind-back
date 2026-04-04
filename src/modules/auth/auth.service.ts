import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { School } from '../../database/entities/school.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { UserRole } from '../../database/enums';
import { DeviceLimitService } from '../device/device-limit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResets: Repository<PasswordResetToken>,
    private readonly deviceLimit: DeviceLimitService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private hashRefresh(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private hashPasswordResetToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  async registerStudent(dto: RegisterStudentDto, req: Request) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exist({ where: { email } })) {
      throw new ConflictException('Email уже зарегистрирован');
    }
    if (await this.users.exist({ where: { iin: dto.iin } })) {
      throw new ConflictException('ИИН уже зарегистрирован');
    }
    const schoolOk = await this.schools.exist({
      where: { id: dto.schoolId, isActive: true },
    });
    if (!schoolOk) {
      throw new BadRequestException('Школа не найдена или неактивна');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const u = this.users.create({
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      patronymic: dto.patronymic?.trim() || null,
      iin: dto.iin,
      schoolId: dto.schoolId,
      role: UserRole.STUDENT,
      isActive: true,
      avatarUrl: null,
    });
    await this.users.save(u);

    const deviceId = dto.deviceId?.trim();
    if (deviceId) {
      const user = await this.users.findOne({ where: { id: u.id } });
      if (!user) {
        throw new BadRequestException('Не удалось загрузить пользователя');
      }
      const deviceResult = await this.deviceLimit.registerOnLogin(
        user,
        deviceId,
        {
          userAgent: req.get('user-agent') ?? null,
          ip: req.ip ?? null,
        },
      );
      if (!deviceResult.allowed) {
        throw new ForbiddenException({
          code: deviceResult.code,
          message: deviceResult.message,
          violationId: deviceResult.violationId,
        });
      }
      const tokens = await this.issueTokenPair(user, req);
      return {
        ...tokens,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
        },
      };
    }

    return {
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      schoolId: u.schoolId,
    };
  }

  async requestPasswordReset(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (user) {
      await this.passwordResets.delete({ userId: user.id });
      const raw = randomBytes(32).toString('base64url');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await this.passwordResets.save(
        this.passwordResets.create({
          userId: user.id,
          tokenHash: this.hashPasswordResetToken(raw),
          expiresAt,
        }),
      );
      if (this.config.get<string>('NODE_ENV') !== 'production') {
        console.warn(
          `[dev] password reset token for ${email}: ${raw} (POST /api/v1/auth/reset-password)`,
        );
      }
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = this.hashPasswordResetToken(token);
    const row = await this.passwordResets.findOne({
      where: { tokenHash: hash },
    });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      if (row) await this.passwordResets.delete({ id: row.id });
      throw new BadRequestException('Недействительный или истёкший токен');
    }
    const user = await this.users.findOne({ where: { id: row.userId } });
    if (!user) {
      await this.passwordResets.delete({ id: row.id });
      throw new BadRequestException('Пользователь не найден');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);
    await this.passwordResets.delete({ id: row.id });
    await this.refreshTokens.delete({ userId: user.id });
    return { ok: true };
  }

  /** Парсинг JWT_ACCESS_EXPIRES: 15m, 1h, 7d, 900s */
  private accessExpiresSeconds(): number {
    const exp = this.config.get<string>('JWT_ACCESS_EXPIRES', '15m').trim();
    const m = exp.match(/^(\d+)\s*([smhd])$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      const u = m[2].toLowerCase();
      if (u === 's') return n;
      if (u === 'm') return n * 60;
      if (u === 'h') return n * 3600;
      if (u === 'd') return n * 86400;
    }
    const num = parseInt(exp, 10);
    return Number.isFinite(num) && num > 0 ? num : 900;
  }

  async issueTokenPair(user: User, req: Request) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const rawRefresh = randomBytes(48).toString('base64url');
    const days = Math.max(
      1,
      parseInt(this.config.get<string>('JWT_REFRESH_DAYS', '14'), 10) || 14,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hashRefresh(rawRefresh),
        expiresAt,
        userAgent: req.get('user-agent') ?? null,
        ip: req.ip ?? null,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.accessExpiresSeconds(),
      tokenType: 'Bearer' as const,
    };
  }

  async login(dto: LoginDto, req: Request) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const skipPassword =
      this.config.get<string>('AUTH_SKIP_PASSWORD') === 'true';
    if (!skipPassword) {
      const ok = await bcrypt.compare(dto.password, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Неверный email или пароль');
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    if (user.role === UserRole.STUDENT) {
      if (!dto.deviceId?.trim()) {
        throw new BadRequestException(
          'Укажите deviceId (стабильный UUID устройства) для входа ученика',
        );
      }
    }

    const deviceResult = await this.deviceLimit.registerOnLogin(
      user,
      user.role === UserRole.STUDENT ? dto.deviceId : undefined,
      {
        userAgent: req.get('user-agent') ?? null,
        ip: req.ip ?? null,
      },
    );

    if (!deviceResult.allowed) {
      throw new ForbiddenException({
        code: deviceResult.code,
        message: deviceResult.message,
        violationId: deviceResult.violationId,
      });
    }

    const tokens = await this.issueTokenPair(user, req);
    return {
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
      },
    };
  }

  async refresh(refreshToken: string, req: Request) {
    const hash = this.hashRefresh(refreshToken);
    const row = await this.refreshTokens.findOne({
      where: { tokenHash: hash },
    });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      if (row) {
        await this.refreshTokens.delete({ id: row.id });
      }
      throw new UnauthorizedException(
        'Недействительный или истёкший refresh-токен',
      );
    }

    const user = await this.users.findOne({ where: { id: row.userId } });
    if (!user?.isActive) {
      await this.refreshTokens.delete({ id: row.id });
      throw new UnauthorizedException('Аккаунт недоступен');
    }

    await this.refreshTokens.delete({ id: row.id });
    const tokens = await this.issueTokenPair(user, req);
    return {
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
      },
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokens.delete({
      tokenHash: this.hashRefresh(refreshToken),
    });
  }

  async revokeAllRefreshForUser(userId: string): Promise<void> {
    await this.refreshTokens.delete({ userId });
  }

  /** Периодическая очистка (можно вызывать из cron) */
  async deleteExpiredRefreshTokens(): Promise<void> {
    await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
  }
}
