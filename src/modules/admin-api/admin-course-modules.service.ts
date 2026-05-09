import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import {
  AdminModuleListSort,
  CreateCourseModuleDto,
  ListModulesByCourseQueryDto,
  PatchCourseModuleDto,
} from './dto/admin-modules.dto';

export type AdminCourseModuleRow = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  unlockAfterCourseModuleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lessonCount: number;
};

@Injectable()
export class AdminCourseModulesService {
  constructor(
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly courseModules: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
  ) {}

  private row(cm: CourseModule, lessonCount: number): AdminCourseModuleRow {
    return {
      id: cm.id,
      courseId: cm.courseId,
      title: cm.title,
      description: cm.description,
      order: cm.order,
      isPublished: cm.isPublished,
      unlockAfterCourseModuleId: cm.unlockAfterCourseModuleId,
      createdAt: cm.createdAt,
      updatedAt: cm.updatedAt,
      lessonCount,
    };
  }

  private async lessonCounts(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;
    const rows: { id: string; n: string | number }[] =
      await this.courseModules.manager.query(
        `
        SELECT cm.id,
          (SELECT COUNT(*)::int FROM lessons l WHERE l.course_module_id = cm.id) AS n
        FROM course_modules cm
        WHERE cm.id = ANY($1::uuid[])
        `,
        [ids],
      );
    for (const r of rows) map.set(r.id, Number(r.n));
    for (const id of ids) if (!map.has(id)) map.set(id, 0);
    return map;
  }

  private async assertCourse(courseId: string): Promise<void> {
    const ok = await this.courses.exist({ where: { id: courseId } });
    if (!ok) throw new NotFoundException('Курс не найден');
  }

  private async assertUnlockCourseModule(
    courseId: string,
    unlockId: string | null | undefined,
    excludeId?: string,
  ): Promise<void> {
    if (unlockId == null) return;
    const u = await this.courseModules.findOne({ where: { id: unlockId } });
    if (!u || u.courseId !== courseId) {
      throw new BadRequestException(
        'unlockAfterCourseModuleId должен указывать на модуль того же курса',
      );
    }
    if (excludeId && unlockId === excludeId) {
      throw new BadRequestException('Модуль не может разблокироваться сам собой');
    }
  }

  private applySort(
    qb: ReturnType<Repository<CourseModule>['createQueryBuilder']>,
    sort: AdminModuleListSort,
  ) {
    switch (sort) {
      case AdminModuleListSort.CREATED_AT_DESC:
        qb.orderBy('cm.createdAt', 'DESC').addOrderBy('cm.id', 'ASC');
        break;
      case AdminModuleListSort.CREATED_AT_ASC:
        qb.orderBy('cm.createdAt', 'ASC').addOrderBy('cm.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_DESC:
        qb.orderBy('cm.order', 'DESC').addOrderBy('cm.title', 'ASC');
        break;
      case AdminModuleListSort.TITLE_DESC:
        qb.orderBy('cm.title', 'DESC').addOrderBy('cm.id', 'ASC');
        break;
      case AdminModuleListSort.TITLE_ASC:
        qb.orderBy('cm.title', 'ASC').addOrderBy('cm.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_ASC:
      default:
        qb.orderBy('cm.order', 'ASC').addOrderBy('cm.title', 'ASC');
        break;
    }
  }

  async listByCourse(
    q: ListModulesByCourseQueryDto & { courseId: string },
    opts?: { schoolAdminReadOnly?: boolean },
  ) {
    if (opts?.schoolAdminReadOnly) {
      const c = await this.courses.findOne({ where: { id: q.courseId } });
      if (!c?.isPublished) throw new NotFoundException('Курс не найден');
    } else {
      await this.assertCourse(q.courseId);
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const sort = q.sort ?? AdminModuleListSort.ORDER_ASC;
    const qb = this.courseModules
      .createQueryBuilder('cm')
      .where('cm.course_id = :cid', { cid: q.courseId });
    this.applySort(qb, sort);
    if (q.search?.trim()) {
      qb.andWhere('cm.title ILIKE :s', { s: `%${q.search.trim()}%` });
    }
    if (opts?.schoolAdminReadOnly) {
      qb.andWhere('cm.is_published = true');
    } else if (q.isPublished !== undefined) {
      qb.andWhere('cm.is_published = :pub', { pub: q.isPublished });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const ids = items.map((m) => m.id);
    const counts = await this.lessonCounts(ids);
    return {
      items: items.map((cm) => this.row(cm, counts.get(cm.id)!)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getOne(
    id: string,
    opts?: { schoolAdminReadOnly?: boolean },
  ): Promise<AdminCourseModuleRow> {
    const cm = await this.courseModules.findOne({
      where: { id },
      relations: { course: true },
    });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    if (opts?.schoolAdminReadOnly) {
      if (!cm.course?.isPublished || !cm.isPublished) {
        throw new NotFoundException('Модуль курса не найден');
      }
    }
    const counts = await this.lessonCounts([id]);
    return this.row(cm, counts.get(id)!);
  }

  async create(
    courseId: string,
    dto: CreateCourseModuleDto,
  ): Promise<AdminCourseModuleRow> {
    await this.assertCourse(courseId);
    await this.assertUnlockCourseModule(
      courseId,
      dto.unlockAfterCourseModuleId ?? null,
    );
    const cm = this.courseModules.create({
      courseId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      order: dto.order ?? 0,
      isPublished: dto.isPublished === true,
      unlockAfterCourseModuleId: dto.unlockAfterCourseModuleId ?? null,
    });
    await this.courseModules.save(cm);
    return this.row(cm, 0);
  }

  async patch(id: string, dto: PatchCourseModuleDto): Promise<AdminCourseModuleRow> {
    const cm = await this.courseModules.findOne({ where: { id } });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    if (dto.title !== undefined) cm.title = dto.title.trim();
    if (dto.description !== undefined) {
      cm.description = dto.description === null ? null : dto.description.trim();
    }
    if (dto.order !== undefined) cm.order = dto.order;
    if (dto.isPublished !== undefined) cm.isPublished = dto.isPublished;
    if (dto.unlockAfterCourseModuleId !== undefined) {
      await this.assertUnlockCourseModule(
        cm.courseId,
        dto.unlockAfterCourseModuleId,
        id,
      );
      cm.unlockAfterCourseModuleId = dto.unlockAfterCourseModuleId;
    }
    await this.courseModules.save(cm);
    return this.getOne(id);
  }

  async remove(id: string): Promise<void> {
    const cm = await this.courseModules.findOne({ where: { id } });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    const nLessons = await this.lessons.count({ where: { courseModuleId: id } });
    if (nLessons > 0) {
      throw new ConflictException(
        'Нельзя удалить модуль курса: внутри есть уроки. Удалите или перенесите уроки.',
      );
    }
    await this.courseModules.remove(cm);
  }
}
