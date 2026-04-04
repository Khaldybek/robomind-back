import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { UserRole } from '../../database/enums';
import {
  GrantCourseAccessDto,
  ListCourseAccessesQueryDto,
} from './dto/admin-course-access.dto';
import { BulkGrantCourseAccessDto } from './dto/bulk-grant-course-access.dto';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AdminCourseAccessService {
  constructor(
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CourseAccess)
    private readonly accesses: Repository<CourseAccess>,
  ) {}

  async grantAccess(
    courseId: string,
    dto: GrantCourseAccessDto,
    actor: AuthUserPayload,
  ) {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      if (!course.isPublished) {
        throw new NotFoundException('Курс не найден');
      }
    }
    const user = await this.users.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.role !== UserRole.STUDENT) {
      throw new ConflictException(
        'Доступ к курсу выдаётся только ученикам (student)',
      );
    }
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (user.schoolId !== actor.schoolId) {
        throw new ForbiddenException('Ученик не относится к вашей школе');
      }
    }
    const grantedBy = actor.role === UserRole.SCHOOL_ADMIN ? actor.id : null;
    const existing = await this.accesses.findOne({
      where: { courseId, userId: dto.userId },
    });
    if (existing && !existing.revokedAt) {
      throw new ConflictException('У пользователя уже есть активный доступ');
    }
    if (existing && existing.revokedAt) {
      existing.revokedAt = null;
      existing.accessType = dto.accessType;
      existing.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      existing.grantedBy = grantedBy;
      await this.accesses.save(existing);
      const reloaded = await this.accesses.findOne({
        where: { id: existing.id },
        relations: { user: true, grantedByUser: true },
      });
      return this.mapAccess(reloaded!);
    }
    const row = this.accesses.create({
      courseId,
      userId: dto.userId,
      accessType: dto.accessType,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      revokedAt: null,
      grantedBy,
    });
    await this.accesses.save(row);
    const full = await this.accesses.findOne({
      where: { id: row.id },
      relations: { user: true, grantedByUser: true },
    });
    return this.mapAccess(full!);
  }

  /** Массовая выдача доступа; дубликаты и отсутствующие userId собираются в `errors` */
  async bulkGrantAccess(
    courseId: string,
    dto: BulkGrantCourseAccessDto,
    actor: AuthUserPayload,
  ) {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      if (!course.isPublished) {
        throw new NotFoundException('Курс не найден');
      }
    }

    const userIds = [...new Set(dto.userIds)];
    const granted: Awaited<
      ReturnType<AdminCourseAccessService['grantAccess']>
    >[] = [];
    const errors: { userId: string; code: 'already_active' | 'not_found' }[] =
      [];
    for (const userId of userIds) {
      try {
        const row = await this.grantAccess(
          courseId,
          {
            userId,
            accessType: dto.accessType,
            expiresAt: dto.expiresAt,
          },
          actor,
        );
        granted.push(row);
      } catch (e) {
        if (e instanceof ConflictException) {
          errors.push({ userId, code: 'already_active' });
        } else if (e instanceof NotFoundException) {
          errors.push({ userId, code: 'not_found' });
        } else {
          throw e;
        }
      }
    }
    return { grantedCount: granted.length, granted, errors };
  }

  private mapAccess(a: CourseAccess) {
    return {
      id: a.id,
      courseId: a.courseId,
      userId: a.userId,
      accessType: a.accessType,
      expiresAt: a.expiresAt,
      revokedAt: a.revokedAt,
      grantedBy: a.grantedBy,
      createdAt: a.createdAt,
      user: a.user
        ? {
            id: a.user.id,
            email: a.user.email,
            firstName: a.user.firstName,
            lastName: a.user.lastName,
          }
        : undefined,
      grantedByUser: a.grantedByUser
        ? {
            id: a.grantedByUser.id,
            email: a.grantedByUser.email,
          }
        : undefined,
    };
  }

  async listAccesses(
    courseId: string,
    q: ListCourseAccessesQueryDto,
    actor: AuthUserPayload,
  ) {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      if (!course.isPublished) {
        throw new NotFoundException('Курс не найден');
      }
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const qb = this.accesses
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.grantedByUser', 'g')
      .where('a.course_id = :cid', { cid: courseId })
      .orderBy('a.createdAt', 'DESC');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      qb.andWhere('u.school_id = :sid', { sid: actor.schoolId });
    }
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: rows.map((a) => this.mapAccess(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async revokeAccess(courseId: string, userId: string, actor: AuthUserPayload) {
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
    const row = await this.accesses.findOne({
      where: { courseId, userId },
    });
    if (!row) throw new NotFoundException('Запись доступа не найдена');
    row.revokedAt = new Date();
    await this.accesses.save(row);
  }

  async listCourseStudents(courseId: string, actor: AuthUserPayload) {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      if (!course.isPublished) {
        throw new NotFoundException('Курс не найден');
      }
    }
    const schoolId =
      actor.role === UserRole.SCHOOL_ADMIN ? actor.schoolId : null;
    const raw = await this.users.manager.query(
      `
      SELECT DISTINCT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName",
        u.school_id AS "schoolId", u.is_active AS "isActive"
      FROM users u
      WHERE u.role = $2
        AND ($3::uuid IS NULL OR u.school_id = $3)
        AND (
          EXISTS (
            SELECT 1 FROM course_accesses ca
            WHERE ca.course_id = $1 AND ca.user_id = u.id AND ca.revoked_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM user_progress up
            WHERE up.course_id = $1 AND up.user_id = u.id
          )
        )
      ORDER BY u.last_name ASC, u.first_name ASC
      `,
      [courseId, UserRole.STUDENT, schoolId],
    );
    return raw.map((r: Record<string, unknown>) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      schoolId: r.schoolId,
      isActive: r.isActive,
    }));
  }
}
