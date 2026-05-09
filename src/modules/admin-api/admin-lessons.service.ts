import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { LessonContent } from '../../database/entities/lesson-content.entity';
import { ModuleContentType } from '../../database/enums';
import {
  AdminModuleListSort,
  CreateAdminLessonDto,
  CreateModuleContentDto,
  ListAdminLessonsQueryDto,
  PatchAdminLessonDto,
  PatchModuleContentDto,
} from './dto/admin-modules.dto';
import { AdminUploadService } from './admin-upload.service';

const INTERNAL_IMAGE_PREFIX = '/api/v1/files/images/';

export type AdminLessonRow = {
  id: string;
  courseModuleId: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  unlockAfterLessonId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contentCount: number;
  progressCount: number;
  hasQuiz: boolean;
  quizId: string | null;
};

export type AdminLessonContentRow = {
  id: string;
  lessonId: string;
  type: string;
  title: string | null;
  content: string | null;
  fileUrl: string | null;
  duration: number | null;
  order: number;
  livestreamUrl: string | null;
  livestreamStartsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminLessonsService {
  constructor(
    @InjectRepository(CourseModule)
    private readonly courseModules: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonContent)
    private readonly contents: Repository<LessonContent>,
    private readonly upload: AdminUploadService,
  ) {}

  private assertImageFileUrl(fileUrl: string | null | undefined) {
    if (fileUrl == null || fileUrl === '') return;
    const t = fileUrl.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) {
      throw new BadRequestException(
        'Для фото нельзя указывать внешний URL. Загрузите файл: POST .../contents/from-file (multipart) или POST /admin/upload/image',
      );
    }
    if (!t.startsWith(INTERNAL_IMAGE_PREFIX)) {
      throw new BadRequestException(
        `Для типа image поле fileUrl должно начинаться с ${INTERNAL_IMAGE_PREFIX} (результат загрузки файла на сервер)`,
      );
    }
  }

  private lessonRow(
    l: Lesson,
    contentCount: number,
    progressCount: number,
    hasQuiz: boolean,
    quizId: string | null,
  ): AdminLessonRow {
    return {
      id: l.id,
      courseModuleId: l.courseModuleId,
      title: l.title,
      description: l.description,
      order: l.order,
      isPublished: l.isPublished,
      unlockAfterLessonId: l.unlockAfterLessonId,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      contentCount,
      progressCount,
      hasQuiz,
      quizId,
    };
  }

  private contentRow(c: LessonContent): AdminLessonContentRow {
    return {
      id: c.id,
      lessonId: c.lessonId,
      type: c.type,
      title: c.title,
      content: c.content,
      fileUrl: c.fileUrl,
      duration: c.duration,
      order: c.order,
      livestreamUrl: c.livestreamUrl,
      livestreamStartsAt: c.livestreamStartsAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private async lessonCounts(ids: string[]): Promise<
    Map<
      string,
      {
        contentCount: number;
        progressCount: number;
        hasQuiz: boolean;
        quizId: string | null;
      }
    >
  > {
    const map = new Map();
    if (ids.length === 0) return map;
    const rows: {
      id: string;
      contentCount: string | number;
      progressCount: string | number;
      quizId: string | null;
    }[] = await this.lessons.manager.query(
      `
      SELECT l.id,
        (SELECT COUNT(*)::int FROM lesson_contents lc WHERE lc.lesson_id = l.id) AS "contentCount",
        (SELECT COUNT(DISTINCT user_id)::int FROM user_progress WHERE lesson_id = l.id) AS "progressCount",
        (SELECT q.id FROM quizzes q WHERE q.lesson_id = l.id LIMIT 1) AS "quizId"
      FROM lessons l
      WHERE l.id = ANY($1::uuid[])
      `,
      [ids],
    );
    for (const r of rows) {
      map.set(r.id, {
        contentCount: Number(r.contentCount),
        progressCount: Number(r.progressCount),
        hasQuiz: r.quizId != null,
        quizId: r.quizId,
      });
    }
    for (const id of ids) {
      if (!map.has(id)) {
        map.set(id, {
          contentCount: 0,
          progressCount: 0,
          hasQuiz: false,
          quizId: null,
        });
      }
    }
    return map;
  }

  private async assertCourseModule(courseModuleId: string): Promise<CourseModule> {
    const cm = await this.courseModules.findOne({ where: { id: courseModuleId } });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    return cm;
  }

  private async assertUnlockLesson(
    courseModuleId: string,
    unlockId: string | null | undefined,
    excludeLessonId?: string,
  ): Promise<void> {
    if (unlockId == null) return;
    const u = await this.lessons.findOne({ where: { id: unlockId } });
    if (!u || u.courseModuleId !== courseModuleId) {
      throw new BadRequestException(
        'unlockAfterLessonId должен указывать на урок того же модуля курса',
      );
    }
    if (excludeLessonId && unlockId === excludeLessonId) {
      throw new BadRequestException('Урок не может разблокироваться сам собой');
    }
  }

  private applyLessonSort(
    qb: ReturnType<Repository<Lesson>['createQueryBuilder']>,
    sort: AdminModuleListSort,
  ) {
    switch (sort) {
      case AdminModuleListSort.CREATED_AT_DESC:
        qb.orderBy('l.createdAt', 'DESC').addOrderBy('l.id', 'ASC');
        break;
      case AdminModuleListSort.CREATED_AT_ASC:
        qb.orderBy('l.createdAt', 'ASC').addOrderBy('l.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_DESC:
        qb.orderBy('l.order', 'DESC').addOrderBy('l.title', 'ASC');
        break;
      case AdminModuleListSort.TITLE_DESC:
        qb.orderBy('l.title', 'DESC').addOrderBy('l.id', 'ASC');
        break;
      case AdminModuleListSort.TITLE_ASC:
        qb.orderBy('l.title', 'ASC').addOrderBy('l.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_ASC:
      default:
        qb.orderBy('l.order', 'ASC').addOrderBy('l.title', 'ASC');
        break;
    }
  }

  async listLessons(
    q: ListAdminLessonsQueryDto,
    opts?: { schoolAdminReadOnly?: boolean },
  ) {
    const cm = await this.courseModules.findOne({
      where: { id: q.courseModuleId },
      relations: { course: true },
    });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    if (opts?.schoolAdminReadOnly) {
      if (!cm.course?.isPublished || !cm.isPublished) {
        throw new NotFoundException('Модуль курса не найден');
      }
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const sort = q.sort ?? AdminModuleListSort.ORDER_ASC;
    const qb = this.lessons
      .createQueryBuilder('l')
      .where('l.course_module_id = :cmid', { cmid: q.courseModuleId });
    this.applyLessonSort(qb, sort);
    if (q.search?.trim()) {
      qb.andWhere('l.title ILIKE :s', { s: `%${q.search.trim()}%` });
    }
    if (opts?.schoolAdminReadOnly) {
      qb.andWhere('l.is_published = true');
    } else if (q.isPublished !== undefined) {
      qb.andWhere('l.is_published = :pub', { pub: q.isPublished });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const ids = items.map((m) => m.id);
    const counts = await this.lessonCounts(ids);
    return {
      items: items.map((l) => {
        const c = counts.get(l.id)!;
        return this.lessonRow(
          l,
          c.contentCount,
          c.progressCount,
          c.hasQuiz,
          c.quizId,
        );
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getLesson(
    id: string,
    opts?: { schoolAdminReadOnly?: boolean },
  ): Promise<AdminLessonRow> {
    const l = opts?.schoolAdminReadOnly
      ? await this.assertSchoolAdminCanReadLesson(id)
      : await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Урок не найден');
    const counts = await this.lessonCounts([id]);
    const c = counts.get(id)!;
    return this.lessonRow(l, c.contentCount, c.progressCount, c.hasQuiz, c.quizId);
  }

  async createLesson(dto: CreateAdminLessonDto): Promise<AdminLessonRow> {
    await this.assertCourseModule(dto.courseModuleId);
    await this.assertUnlockLesson(
      dto.courseModuleId,
      dto.unlockAfterLessonId ?? null,
    );
    const l = this.lessons.create({
      courseModuleId: dto.courseModuleId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      order: dto.order ?? 0,
      isPublished: dto.isPublished === true,
      unlockAfterLessonId: dto.unlockAfterLessonId ?? null,
    });
    await this.lessons.save(l);
    return this.lessonRow(l, 0, 0, false, null);
  }

  async patchLesson(id: string, dto: PatchAdminLessonDto): Promise<AdminLessonRow> {
    const l = await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Урок не найден');
    if (dto.title !== undefined) l.title = dto.title.trim();
    if (dto.description !== undefined) {
      l.description = dto.description === null ? null : dto.description.trim();
    }
    if (dto.order !== undefined) l.order = dto.order;
    if (dto.isPublished !== undefined) l.isPublished = dto.isPublished;
    if (dto.unlockAfterLessonId !== undefined) {
      await this.assertUnlockLesson(l.courseModuleId, dto.unlockAfterLessonId, id);
      l.unlockAfterLessonId = dto.unlockAfterLessonId;
    }
    await this.lessons.save(l);
    return this.getLesson(id);
  }

  async deleteLesson(id: string): Promise<void> {
    const l = await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Урок не найден');
    const counts = await this.lessonCounts([id]);
    const c = counts.get(id)!;
    if (c.progressCount > 0) {
      throw new ConflictException(
        'Нельзя удалить урок: есть прогресс студентов по этому уроку',
      );
    }
    const attemptRows: { n: string }[] = await this.lessons.manager.query(
      `SELECT COUNT(*)::int AS n FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id WHERE q.lesson_id = $1`,
      [id],
    );
    if (Number(attemptRows[0]?.n) > 0) {
      throw new ConflictException(
        'Нельзя удалить урок: есть попытки прохождения теста',
      );
    }
    await this.lessons.remove(l);
  }

  private async assertLesson(lessonId: string): Promise<Lesson> {
    const l = await this.lessons.findOne({ where: { id: lessonId } });
    if (!l) throw new NotFoundException('Урок не найден');
    return l;
  }

  /** Школьный админ видит только опубликованный курс + секцию + урок (как у студента по смыслу). */
  private async assertSchoolAdminCanReadLesson(lessonId: string): Promise<Lesson> {
    const l = await this.lessons.findOne({
      where: { id: lessonId },
      relations: { courseModule: { course: true } },
    });
    if (!l) throw new NotFoundException('Урок не найден');
    const c = l.courseModule?.course;
    if (!c?.isPublished || !l.courseModule.isPublished || !l.isPublished) {
      throw new NotFoundException('Урок не найден');
    }
    return l;
  }

  async listContents(
    lessonId: string,
    opts?: { schoolAdminReadOnly?: boolean },
  ): Promise<AdminLessonContentRow[]> {
    if (opts?.schoolAdminReadOnly) {
      await this.assertSchoolAdminCanReadLesson(lessonId);
    } else {
      await this.assertLesson(lessonId);
    }
    const list = await this.contents.find({
      where: { lessonId },
      order: { order: 'ASC', id: 'ASC' },
    });
    return list.map((x) => this.contentRow(x));
  }

  async createContent(
    lessonId: string,
    dto: CreateModuleContentDto,
  ): Promise<AdminLessonContentRow> {
    await this.assertLesson(lessonId);
    if (dto.type === ModuleContentType.IMAGE) {
      const fu = dto.fileUrl?.trim();
      if (!fu) {
        throw new BadRequestException(
          'Для фото укажите файл: POST /admin/lessons/:lessonId/contents/from-file (multipart, поле file), либо сначала POST /admin/upload/image и вставьте fileUrl из ответа',
        );
      }
      this.assertImageFileUrl(fu);
    }
    const row = this.contents.create({
      lessonId,
      type: dto.type,
      title: dto.title?.trim() ?? null,
      content: dto.content ?? null,
      fileUrl: dto.fileUrl?.trim() ?? null,
      duration: dto.duration ?? null,
      order: dto.order ?? 0,
      livestreamUrl: dto.livestreamUrl?.trim() ?? null,
      livestreamStartsAt: dto.livestreamStartsAt
        ? new Date(dto.livestreamStartsAt)
        : null,
    });
    await this.contents.save(row);
    return this.contentRow(row);
  }

  async createContentFromFile(
    lessonId: string,
    file: Express.Multer.File | undefined,
    kind: 'image' | 'video' | 'file',
    extra: {
      title?: string;
      order?: number;
      content?: string | null;
    },
  ): Promise<AdminLessonContentRow> {
    await this.assertLesson(lessonId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Прикрепите файл (поле file)');
    }
    let fileUrl: string;
    let type: ModuleContentType;
    if (kind === 'image') {
      const meta = this.upload.image(file);
      fileUrl = meta.url;
      type = ModuleContentType.IMAGE;
    } else if (kind === 'video') {
      const meta = this.upload.video(file);
      fileUrl = meta.url;
      type = ModuleContentType.VIDEO;
    } else {
      const meta = this.upload.document(file);
      fileUrl = meta.url;
      type = ModuleContentType.FILE;
    }
    const row = this.contents.create({
      lessonId,
      type,
      title: extra.title?.trim() ?? null,
      content: extra.content ?? null,
      fileUrl,
      duration: null,
      order: extra.order ?? 0,
      livestreamUrl: null,
      livestreamStartsAt: null,
    });
    await this.contents.save(row);
    return this.contentRow(row);
  }

  async patchContent(
    lessonId: string,
    contentId: string,
    dto: PatchModuleContentDto,
  ): Promise<AdminLessonContentRow> {
    const row = await this.contents.findOne({
      where: { id: contentId, lessonId },
    });
    if (!row) throw new NotFoundException('Блок контента не найден');
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.title !== undefined)
      row.title = dto.title === null ? null : dto.title.trim();
    if (dto.content !== undefined) row.content = dto.content;
    if (dto.fileUrl !== undefined)
      row.fileUrl = dto.fileUrl === null ? null : dto.fileUrl.trim();
    if (dto.duration !== undefined) row.duration = dto.duration;
    if (dto.order !== undefined) row.order = dto.order;
    if (dto.livestreamUrl !== undefined)
      row.livestreamUrl =
        dto.livestreamUrl === null ? null : dto.livestreamUrl.trim();
    if (dto.livestreamStartsAt !== undefined) {
      row.livestreamStartsAt = dto.livestreamStartsAt
        ? new Date(dto.livestreamStartsAt)
        : null;
    }
    if (row.type === ModuleContentType.IMAGE) {
      if (!row.fileUrl) {
        throw new BadRequestException(
          'Для блока «фото» нужен файл: укажите fileUrl с путём /api/v1/files/images/... или замените через POST .../contents/from-file',
        );
      }
      this.assertImageFileUrl(row.fileUrl);
    }
    await this.contents.save(row);
    return this.contentRow(row);
  }

  async deleteContent(lessonId: string, contentId: string): Promise<void> {
    const row = await this.contents.findOne({
      where: { id: contentId, lessonId },
    });
    if (!row) throw new NotFoundException('Блок контента не найден');
    await this.contents.remove(row);
  }
}
