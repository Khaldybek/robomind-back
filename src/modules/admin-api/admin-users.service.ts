import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { parseStudentImportXlsx } from './admin-student-import.parser';
import { User } from '../../database/entities/user.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { School } from '../../database/entities/school.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserRole } from '../../database/enums';
import { ListAdminUsersQueryDto, PutAdminUserDto } from './dto/admin-users.dto';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';

export type StudentImportCreatedRow = {
  sheetRow: number;
  id: string;
  email: string;
  iin: string;
  firstName: string;
  lastName: string;
  patronymic: string | null;
  /** Одноразовый пароль; в БД не хранится, только в ответе */
  temporaryPassword: string;
};

export type StudentImportErrorRow = {
  sheetRow: number;
  email?: string;
  iin?: string;
  message: string;
};

export type AdminUserPublic = {
  id: string;
  iin: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string | null;
  role: UserRole;
  isActive: boolean;
  schoolId: string | null;
  school: {
    id: string;
    name: string;
    number: number | null;
  } | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserProgress)
    private readonly progress: Repository<UserProgress>,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttempts: Repository<QuizAttempt>,
  ) {}

  private toPublic(u: User, maskIin = false): AdminUserPublic {
    const s = u.school;
    return {
      id: u.id,
      iin: maskIin ? '••••••••••••' : u.iin,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      patronymic: u.patronymic,
      role: u.role,
      isActive: u.isActive,
      schoolId: u.schoolId,
      school: s ? { id: s.id, name: s.name, number: s.number } : null,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private assertSchoolForRole(
    role: UserRole,
    schoolId: string | null | undefined,
  ) {
    if (role === UserRole.STUDENT || role === UserRole.SCHOOL_ADMIN) {
      if (!schoolId) {
        throw new BadRequestException(
          'Для роли student и school_admin нужен schoolId',
        );
      }
    }
    if (role === UserRole.SUPER_ADMIN && schoolId) {
      throw new BadRequestException('У super_admin не должно быть schoolId');
    }
  }

  async listUsers(q: ListAdminUsersQueryDto, actor: AuthUserPayload) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.school', 's')
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id', 'ASC');

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      qb.andWhere('u.school_id = :sid', { sid: actor.schoolId });
      qb.andWhere('u.role = :st', { st: UserRole.STUDENT });
    } else {
      if (q.schoolId) qb.andWhere('u.school_id = :sid', { sid: q.schoolId });
      if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    }

    if (q.isActive !== undefined) {
      qb.andWhere('u.is_active = :a', { a: q.isActive });
    }
    if (q.search?.trim()) {
      const p = `%${q.search.trim()}%`;
      qb.andWhere(
        '(u.email ILIKE :p OR u.first_name ILIKE :p OR u.last_name ILIKE :p OR u.iin ILIKE :p)',
        { p },
      );
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const maskIin = actor.role === UserRole.SCHOOL_ADMIN;
    return {
      items: items.map((u) => this.toPublic(u, maskIin)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUser(id: string, actor: AuthUserPayload): Promise<AdminUserPublic> {
    const u = await this.users.findOne({
      where: { id },
      relations: { school: true },
    });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
    return this.toPublic(u, false);
  }

  async updateUser(
    id: string,
    dto: PutAdminUserDto,
    actor: AuthUserPayload,
  ): Promise<AdminUserPublic> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Пользователь не найден');

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
      if (
        dto.email !== undefined ||
        dto.iin !== undefined ||
        dto.role !== undefined ||
        dto.schoolId !== undefined
      ) {
        throw new ForbiddenException(
          'Админ школы может менять только ФИО, активность, аватар и пароль',
        );
      }
    }

    const nextRole = dto.role ?? u.role;
    let nextSchool = dto.schoolId !== undefined ? dto.schoolId : u.schoolId;
    if (dto.role === UserRole.SUPER_ADMIN) {
      nextSchool = null;
    }
    this.assertSchoolForRole(nextRole, nextSchool);

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const other = await this.users.findOne({ where: { email } });
      if (other && other.id !== id) {
        throw new ConflictException('Email уже занят');
      }
      u.email = email;
    }
    if (dto.password !== undefined) {
      u.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.firstName !== undefined) u.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) u.lastName = dto.lastName.trim();
    if (dto.patronymic !== undefined) {
      u.patronymic =
        dto.patronymic === null ? null : dto.patronymic.trim() || null;
    }
    if (dto.iin !== undefined) {
      const other = await this.users.findOne({ where: { iin: dto.iin } });
      if (other && other.id !== id) {
        throw new ConflictException('ИИН уже занят');
      }
      u.iin = dto.iin;
    }
    if (dto.role !== undefined) u.role = dto.role;
    if (dto.role === UserRole.SUPER_ADMIN) {
      u.schoolId = null;
    } else if (dto.schoolId !== undefined) {
      if (dto.schoolId) {
        const ok = await this.schools.exist({ where: { id: dto.schoolId } });
        if (!ok) throw new NotFoundException('Школа не найдена');
      }
      u.schoolId = dto.schoolId;
    }
    if (dto.isActive !== undefined) u.isActive = dto.isActive;
    if (dto.avatarUrl !== undefined) {
      u.avatarUrl = dto.avatarUrl === null ? null : dto.avatarUrl.trim();
    }
    await this.users.save(u);
    return this.getUser(id, actor);
  }

  async activateUser(
    id: string,
    actor: AuthUserPayload,
  ): Promise<AdminUserPublic> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
    u.isActive = true;
    await this.users.save(u);
    return this.getUser(id, actor);
  }

  async getUserProgress(userId: string, actor: AuthUserPayload) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
    const rows = await this.progress.find({
      where: { userId },
      relations: { course: true, module: true },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      courseTitle: p.course?.title ?? null,
      moduleId: p.moduleId,
      moduleTitle: p.module?.title ?? null,
      status: p.status,
      completedAt: p.completedAt,
      watchedSeconds: p.watchedSeconds,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getUserCertificates(userId: string, actor: AuthUserPayload) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
    const rows = await this.certificates.find({
      where: { userId },
      relations: { course: true },
      order: { issuedAt: 'DESC' },
    });
    return rows.map((c) => ({
      id: c.id,
      courseId: c.courseId,
      courseTitle: c.course?.title ?? null,
      issuedAt: c.issuedAt,
      pdfUrl: c.pdfUrl,
      uniqueCode: c.uniqueCode,
      createdAt: c.createdAt,
    }));
  }

  /** Попытки тестов ученика (без тела ответов — только факт наличия) */
  async getUserQuizAttempts(userId: string, actor: AuthUserPayload) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        u.schoolId !== actor.schoolId ||
        u.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
    const rows = await this.quizAttempts.find({
      where: { userId },
      relations: {
        quiz: { module: { course: true } },
      },
      order: { startedAt: 'DESC' },
    });
    return rows.map((a) => {
      const mod = a.quiz?.module;
      const course = mod?.course;
      return {
        id: a.id,
        quizId: a.quizId,
        userId: a.userId,
        score: a.score,
        maxScore: a.maxScore,
        isPassed: a.isPassed,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        /** Детали ответов не отдаются; только факт, что попытка завершена с сохранёнными ответами */
        hasStoredAnswers: a.completedAt != null && a.answers != null,
        courseId: course?.id ?? null,
        courseTitle: course?.title ?? null,
        moduleId: mod?.id ?? null,
        moduleTitle: mod?.title ?? null,
        quizTitle: a.quiz?.title ?? null,
        createdAt: a.createdAt,
      };
    });
  }

  /**
   * Массовое создание учеников из .xlsx (только school_admin).
   * Школа берётся из JWT; пароли генерируются на сервере и возвращаются один раз.
   */
  async importStudentsFromExcel(
    buffer: Buffer,
    actor: AuthUserPayload,
  ): Promise<{
    summary: { totalRows: number; created: number; failed: number };
    created: StudentImportCreatedRow[];
    errors: StudentImportErrorRow[];
  }> {
    if (actor.role !== UserRole.SCHOOL_ADMIN || !actor.schoolId) {
      throw new ForbiddenException(
        'Импорт доступен только администратору школы',
      );
    }

    const schoolOk = await this.schools.exist({
      where: { id: actor.schoolId, isActive: true },
    });
    if (!schoolOk) {
      throw new BadRequestException('Школа не найдена или неактивна');
    }

    const parsed = await parseStudentImportXlsx(buffer);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }

    const created: StudentImportCreatedRow[] = [];
    const errors: StudentImportErrorRow[] = [];
    const seenIin = new Set<string>();
    const seenEmail = new Set<string>();

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of parsed.rows) {
      const sheetRow = row.sheetRow;
      const iinDigits = row.iin.replace(/\D/g, '');
      const email = row.email.trim().toLowerCase();

      if (iinDigits.length !== 12) {
        errors.push({
          sheetRow,
          email: row.email || undefined,
          iin: row.iin || undefined,
          message: 'ИИН должен содержать 12 цифр',
        });
        continue;
      }

      if (!email || !emailRe.test(email)) {
        errors.push({
          sheetRow,
          email: row.email || undefined,
          iin: iinDigits,
          message: 'Некорректный email',
        });
        continue;
      }

      const firstName = row.firstName.trim();
      const lastName = row.lastName.trim();
      if (!firstName || firstName.length > 255) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'Имя обязательно (до 255 символов)',
        });
        continue;
      }
      if (!lastName || lastName.length > 255) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'Фамилия обязательна (до 255 символов)',
        });
        continue;
      }

      const patronymic =
        row.patronymic && row.patronymic.trim().length > 0
          ? row.patronymic.trim().slice(0, 255)
          : null;

      if (seenIin.has(iinDigits)) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'Повтор ИИН в файле',
        });
        continue;
      }
      if (seenEmail.has(email)) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'Повтор email в файле',
        });
        continue;
      }

      const dupIin = await this.users.exist({ where: { iin: iinDigits } });
      if (dupIin) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'ИИН уже зарегистрирован',
        });
        continue;
      }
      const dupEmail = await this.users.exist({ where: { email } });
      if (dupEmail) {
        errors.push({
          sheetRow,
          email,
          iin: iinDigits,
          message: 'Email уже зарегистрирован',
        });
        continue;
      }

      seenIin.add(iinDigits);
      seenEmail.add(email);

      const temporaryPassword = generateTemporaryPassword();
      try {
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const u = this.users.create({
          email,
          passwordHash,
          firstName,
          lastName,
          patronymic,
          iin: iinDigits,
          schoolId: actor.schoolId,
          role: UserRole.STUDENT,
          isActive: true,
          avatarUrl: null,
        });
        await this.users.save(u);
        created.push({
          sheetRow,
          id: u.id,
          email: u.email,
          iin: u.iin,
          firstName: u.firstName,
          lastName: u.lastName,
          patronymic: u.patronymic,
          temporaryPassword,
        });
      } catch (e) {
        if (e instanceof QueryFailedError) {
          const code = (e as { driverError?: { code?: string } }).driverError
            ?.code;
          if (code === '23505') {
            errors.push({
              sheetRow,
              email,
              iin: iinDigits,
              message: 'ИИН или email уже занят',
            });
            continue;
          }
        }
        throw e;
      }
    }

    return {
      summary: {
        totalRows: parsed.rows.length,
        created: created.length,
        failed: errors.length,
      },
      created,
      errors,
    };
  }

  /** CSV учеников школы (только school_admin) */
  async exportStudentsCsv(actor: AuthUserPayload): Promise<string> {
    if (actor.role !== UserRole.SCHOOL_ADMIN || !actor.schoolId) {
      throw new ForbiddenException(
        'Экспорт доступен только администратору школы',
      );
    }
    const rows = await this.users.find({
      where: { schoolId: actor.schoolId, role: UserRole.STUDENT },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    const esc = (v: string | number | boolean) => {
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = [
      'email',
      'firstName',
      'lastName',
      'iin',
      'isActive',
      'createdAt',
    ].join(',');
    const lines = rows.map((r) =>
      [
        r.email,
        r.firstName,
        r.lastName,
        r.iin,
        r.isActive,
        r.createdAt.toISOString(),
      ]
        .map(esc)
        .join(','),
    );
    return '\uFEFF' + header + '\n' + lines.join('\n');
  }

  async deleteUser(id: string, actor: AuthUserPayload): Promise<void> {
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException(
        'Админ школы не может удалять пользователей',
      );
    }
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (u.role === UserRole.SUPER_ADMIN) {
      const cnt = await this.users.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      if (cnt <= 1) {
        throw new ConflictException('Нельзя удалить последнего супер-админа');
      }
    }
    try {
      await this.users.remove(u);
    } catch {
      throw new ConflictException(
        'Нельзя удалить пользователя: есть связанные данные в БД',
      );
    }
  }
}

const TEMP_PWD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Пароль для выдачи администратору; не хранится в открытом виде. */
function generateTemporaryPassword(length = 14): string {
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += TEMP_PWD_CHARS[randomInt(TEMP_PWD_CHARS.length)];
  }
  return pwd;
}
