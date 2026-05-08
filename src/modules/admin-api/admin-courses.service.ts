import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { UserRole } from '../../database/enums';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';
import {
  AdminCourseListSort,
  CreateAdminCourseDto,
  ListAdminCoursesQueryDto,
  PatchAdminCourseDto,
} from './dto/admin-courses.dto';

export type AdminCourseRow = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl: string | null;
  ageGroup: string | null;
  /** Всего уроков в курсе (по всем модулям курса) */
  moduleCount: number;
  /** Секций курса (модулей курса) */
  courseModuleCount: number;
  studentsCount: number;
};

@Injectable()
export class AdminCoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
  ) {}

  private row(
    c: Course,
    moduleCount: number,
    courseModuleCount: number,
    studentsCount: number,
  ): AdminCourseRow {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      level: c.level,
      isPublished: c.isPublished,
      order: c.order,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      thumbnailUrl: c.thumbnailUrl,
      ageGroup: c.ageGroup,
      moduleCount,
      courseModuleCount,
      studentsCount,
    };
  }

  private async countsByCourseIds(
    ids: string[],
    schoolId?: string | null,
  ): Promise<
    Map<
      string,
      { moduleCount: number; courseModuleCount: number; studentsCount: number }
    >
  > {
    const map = new Map<
      string,
      {
        moduleCount: number;
        courseModuleCount: number;
        studentsCount: number;
      }
    >();
    if (ids.length === 0) return map;
    const studentsSubq = schoolId
      ? `
        (SELECT COUNT(DISTINCT uid)::int FROM (
          SELECT ca.user_id AS uid FROM course_accesses ca
          INNER JOIN users u ON u.id = ca.user_id AND u.school_id = $2
          WHERE ca.course_id = c.id AND ca.revoked_at IS NULL
          UNION
          SELECT up.user_id AS uid FROM user_progress up
          INNER JOIN users u ON u.id = up.user_id AND u.school_id = $2
          WHERE up.course_id = c.id
        ) t)
      `
      : `
        (SELECT COUNT(DISTINCT uid)::int FROM (
          SELECT user_id AS uid FROM course_accesses
            WHERE course_id = c.id AND revoked_at IS NULL
          UNION
          SELECT user_id AS uid FROM user_progress WHERE course_id = c.id
        ) t)
      `;
    const sql = `
      SELECT c.id,
        (SELECT COUNT(*)::int FROM lessons l
          INNER JOIN course_modules cm ON cm.id = l.course_module_id
          WHERE cm.course_id = c.id) AS "moduleCount",
        (SELECT COUNT(*)::int FROM course_modules cm WHERE cm.course_id = c.id) AS "courseModuleCount",
        ${studentsSubq} AS "studentsCount"
      FROM courses c
      WHERE c.id = ANY($1::uuid[])
    `;
    const params = schoolId ? [ids, schoolId] : [ids];
    const rows: {
      id: string;
      moduleCount: string | number;
      courseModuleCount: string | number;
      studentsCount: string | number;
    }[] = await this.courses.manager.query(sql, params);
    for (const r of rows) {
      map.set(r.id, {
        moduleCount: Number(r.moduleCount),
        courseModuleCount: Number(r.courseModuleCount),
        studentsCount: Number(r.studentsCount),
      });
    }
    for (const id of ids) {
      if (!map.has(id)) {
        map.set(id, { moduleCount: 0, courseModuleCount: 0, studentsCount: 0 });
      }
    }
    return map;
  }

  private applySort(
    qb: ReturnType<Repository<Course>['createQueryBuilder']>,
    sort: AdminCourseListSort,
  ) {
    switch (sort) {
      case AdminCourseListSort.CREATED_AT_DESC:
        qb.orderBy('c.createdAt', 'DESC').addOrderBy('c.id', 'ASC');
        break;
      case AdminCourseListSort.CREATED_AT_ASC:
        qb.orderBy('c.createdAt', 'ASC').addOrderBy('c.id', 'ASC');
        break;
      case AdminCourseListSort.ORDER_DESC:
        qb.orderBy('c.order', 'DESC').addOrderBy('c.title', 'ASC');
        break;
      case AdminCourseListSort.TITLE_DESC:
        qb.orderBy('c.title', 'DESC').addOrderBy('c.id', 'ASC');
        break;
      case AdminCourseListSort.TITLE_ASC:
        qb.orderBy('c.title', 'ASC').addOrderBy('c.id', 'ASC');
        break;
      case AdminCourseListSort.ORDER_ASC:
      default:
        qb.orderBy('c.order', 'ASC').addOrderBy('c.title', 'ASC');
        break;
    }
  }

  async listCourses(q: ListAdminCoursesQueryDto, actor: AuthUserPayload) {
    if (actor.role === UserRole.SCHOOL_ADMIN && !actor.schoolId) {
      throw new ForbiddenException('У администратора школы не задан schoolId');
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const sort = q.sort ?? AdminCourseListSort.ORDER_ASC;
    const qb = this.courses.createQueryBuilder('c');
    this.applySort(qb, sort);
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      qb.andWhere('c.title ILIKE :s', { s });
    }
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      qb.andWhere('c.is_published = true');
    } else if (q.isPublished !== undefined) {
      qb.andWhere('c.is_published = :pub', { pub: q.isPublished });
    }
    if (q.level !== undefined) {
      qb.andWhere('c.level = :level', { level: q.level });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const ids = items.map((c) => c.id);
    const schoolScope =
      actor.role === UserRole.SCHOOL_ADMIN ? actor.schoolId : null;
    const counts = await this.countsByCourseIds(ids, schoolScope);
    return {
      items: items.map((c) => {
        const { moduleCount, courseModuleCount, studentsCount } =
          counts.get(c.id)!;
        return this.row(c, moduleCount, courseModuleCount, studentsCount);
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCourse(id: string, actor: AuthUserPayload): Promise<AdminCourseRow> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN && !c.isPublished) {
      throw new NotFoundException('Курс не найден');
    }
    const schoolScope =
      actor.role === UserRole.SCHOOL_ADMIN ? actor.schoolId : null;
    const counts = await this.countsByCourseIds([id], schoolScope);
    const { moduleCount, courseModuleCount, studentsCount } = counts.get(id)!;
    return this.row(c, moduleCount, courseModuleCount, studentsCount);
  }

  async createCourse(dto: CreateAdminCourseDto): Promise<AdminCourseRow> {
    const c = this.courses.create({
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      level: dto.level,
      isPublished: dto.isPublished === true,
      order: dto.order ?? 0,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      ageGroup: dto.ageGroup?.trim() || null,
    });
    await this.courses.save(c);
    return this.row(c, 0, 0, 0);
  }

  async patchCourse(
    id: string,
    dto: PatchAdminCourseDto,
    actor: AuthUserPayload,
  ): Promise<AdminCourseRow> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Курс не найден');
    if (dto.title !== undefined) c.title = dto.title.trim();
    if (dto.description !== undefined)
      c.description = dto.description === null ? null : dto.description.trim();
    if (dto.level !== undefined) c.level = dto.level;
    if (dto.isPublished !== undefined) c.isPublished = dto.isPublished;
    if (dto.order !== undefined) c.order = dto.order;
    if (dto.thumbnailUrl !== undefined)
      c.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    if (dto.ageGroup !== undefined)
      c.ageGroup = dto.ageGroup === null ? null : dto.ageGroup?.trim() || null;
    await this.courses.save(c);
    return this.getCourse(id, actor);
  }

  async deleteCourse(id: string): Promise<void> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Курс не найден');
    const counts = await this.countsByCourseIds([id], null);
    const { moduleCount, courseModuleCount, studentsCount } = counts.get(id)!;
    if (moduleCount > 0 || courseModuleCount > 0 || studentsCount > 0) {
      throw new ConflictException(
        'Нельзя удалить курс: есть модули/уроки или студенты (доступ/прогресс). Снимите с публикации (PATCH isPublished: false) или удалите контент и отзовите доступ.',
      );
    }
    await this.courses.remove(c);
  }
}
