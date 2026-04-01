import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { Module } from '../../database/entities/module.entity';
import { ModuleContent } from '../../database/entities/module-content.entity';
import { ModuleContentType } from '../../database/enums';
import {
  AdminModuleListSort,
  CreateAdminModuleDto,
  CreateModuleContentDto,
  ListAdminModulesQueryDto,
  PatchAdminModuleDto,
  PatchModuleContentDto,
} from './dto/admin-modules.dto';
import { AdminUploadService } from './admin-upload.service';

const INTERNAL_IMAGE_PREFIX = '/api/v1/files/images/';

export type AdminModuleRow = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  unlockAfterModuleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contentCount: number;
  progressCount: number;
  hasQuiz: boolean;
  quizId: string | null;
};

export type AdminModuleContentRow = {
  id: string;
  moduleId: string;
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
export class AdminModulesService {
  constructor(
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(Module)
    private readonly modules: Repository<Module>,
    @InjectRepository(ModuleContent)
    private readonly contents: Repository<ModuleContent>,
    private readonly upload: AdminUploadService,
  ) {}

  /** Для image: только загрузка на сервер, не внешние http(s) URL */
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

  private moduleRow(
    m: Module,
    contentCount: number,
    progressCount: number,
    hasQuiz: boolean,
    quizId: string | null,
  ): AdminModuleRow {
    return {
      id: m.id,
      courseId: m.courseId,
      title: m.title,
      description: m.description,
      order: m.order,
      isPublished: m.isPublished,
      unlockAfterModuleId: m.unlockAfterModuleId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      contentCount,
      progressCount,
      hasQuiz,
      quizId,
    };
  }

  private contentRow(c: ModuleContent): AdminModuleContentRow {
    return {
      id: c.id,
      moduleId: c.moduleId,
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

  private async moduleCounts(ids: string[]): Promise<
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
    }[] = await this.modules.manager.query(
      `
      SELECT m.id,
        (SELECT COUNT(*)::int FROM module_contents mc WHERE mc.module_id = m.id) AS "contentCount",
        (SELECT COUNT(DISTINCT user_id)::int FROM user_progress WHERE module_id = m.id) AS "progressCount",
        (SELECT q.id FROM quizzes q WHERE q.module_id = m.id LIMIT 1) AS "quizId"
      FROM modules m
      WHERE m.id = ANY($1::uuid[])
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

  private async assertCourse(courseId: string): Promise<void> {
    const ok = await this.courses.exist({ where: { id: courseId } });
    if (!ok) throw new NotFoundException('Курс не найден');
  }

  private async assertUnlockModule(
    courseId: string,
    unlockId: string | null | undefined,
    excludeModuleId?: string,
  ): Promise<void> {
    if (unlockId == null) return;
    const u = await this.modules.findOne({ where: { id: unlockId } });
    if (!u || u.courseId !== courseId) {
      throw new BadRequestException(
        'unlockAfterModuleId должен указывать на модуль того же курса',
      );
    }
    if (excludeModuleId && unlockId === excludeModuleId) {
      throw new BadRequestException('Модуль не может разблокироваться сам собой');
    }
  }

  private applyModuleSort(
    qb: ReturnType<Repository<Module>['createQueryBuilder']>,
    sort: AdminModuleListSort,
  ) {
    switch (sort) {
      case AdminModuleListSort.CREATED_AT_DESC:
        qb.orderBy('m.createdAt', 'DESC').addOrderBy('m.id', 'ASC');
        break;
      case AdminModuleListSort.CREATED_AT_ASC:
        qb.orderBy('m.createdAt', 'ASC').addOrderBy('m.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_DESC:
        qb.orderBy('m.order', 'DESC').addOrderBy('m.title', 'ASC');
        break;
      case AdminModuleListSort.TITLE_DESC:
        qb.orderBy('m.title', 'DESC').addOrderBy('m.id', 'ASC');
        break;
      case AdminModuleListSort.TITLE_ASC:
        qb.orderBy('m.title', 'ASC').addOrderBy('m.id', 'ASC');
        break;
      case AdminModuleListSort.ORDER_ASC:
      default:
        qb.orderBy('m.order', 'ASC').addOrderBy('m.title', 'ASC');
        break;
    }
  }

  async listModules(
    q: ListAdminModulesQueryDto,
    opts?: { schoolAdminReadOnly?: boolean },
  ) {
    if (opts?.schoolAdminReadOnly) {
      const c = await this.courses.findOne({ where: { id: q.courseId } });
      if (!c?.isPublished) {
        throw new NotFoundException('Курс не найден');
      }
    } else {
      await this.assertCourse(q.courseId);
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const sort = q.sort ?? AdminModuleListSort.ORDER_ASC;
    const qb = this.modules
      .createQueryBuilder('m')
      .where('m.course_id = :cid', { cid: q.courseId });
    this.applyModuleSort(qb, sort);
    if (q.search?.trim()) {
      qb.andWhere('m.title ILIKE :s', { s: `%${q.search.trim()}%` });
    }
    if (opts?.schoolAdminReadOnly) {
      qb.andWhere('m.is_published = true');
    } else if (q.isPublished !== undefined) {
      qb.andWhere('m.is_published = :pub', { pub: q.isPublished });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const ids = items.map((m) => m.id);
    const counts = await this.moduleCounts(ids);
    return {
      items: items.map((m) => {
        const c = counts.get(m.id)!;
        return this.moduleRow(
          m,
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

  async getModule(id: string): Promise<AdminModuleRow> {
    const m = await this.modules.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Модуль не найден');
    const counts = await this.moduleCounts([id]);
    const c = counts.get(id)!;
    return this.moduleRow(
      m,
      c.contentCount,
      c.progressCount,
      c.hasQuiz,
      c.quizId,
    );
  }

  async createModule(dto: CreateAdminModuleDto): Promise<AdminModuleRow> {
    await this.assertCourse(dto.courseId);
    await this.assertUnlockModule(
      dto.courseId,
      dto.unlockAfterModuleId ?? null,
    );
    const mod = this.modules.create({
      courseId: dto.courseId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      order: dto.order ?? 0,
      isPublished: dto.isPublished === true,
      unlockAfterModuleId: dto.unlockAfterModuleId ?? null,
    });
    await this.modules.save(mod);
    return this.moduleRow(mod, 0, 0, false, null);
  }

  async patchModule(id: string, dto: PatchAdminModuleDto): Promise<AdminModuleRow> {
    const m = await this.modules.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Модуль не найден');
    if (dto.title !== undefined) m.title = dto.title.trim();
    if (dto.description !== undefined) {
      m.description =
        dto.description === null ? null : dto.description.trim();
    }
    if (dto.order !== undefined) m.order = dto.order;
    if (dto.isPublished !== undefined) m.isPublished = dto.isPublished;
    if (dto.unlockAfterModuleId !== undefined) {
      await this.assertUnlockModule(
        m.courseId,
        dto.unlockAfterModuleId,
        id,
      );
      m.unlockAfterModuleId = dto.unlockAfterModuleId;
    }
    await this.modules.save(m);
    return this.getModule(id);
  }

  async deleteModule(id: string): Promise<void> {
    const m = await this.modules.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Модуль не найден');
    const counts = await this.moduleCounts([id]);
    const c = counts.get(id)!;
    if (c.progressCount > 0) {
      throw new ConflictException(
        'Нельзя удалить модуль: есть прогресс студентов по этому модулю',
      );
    }
    const attemptRows: { n: string }[] = await this.modules.manager.query(
      `SELECT COUNT(*)::int AS n FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id WHERE q.module_id = $1`,
      [id],
    );
    if (Number(attemptRows[0]?.n) > 0) {
      throw new ConflictException(
        'Нельзя удалить модуль: есть попытки прохождения теста',
      );
    }
    await this.modules.remove(m);
  }

  private async assertModule(moduleId: string): Promise<Module> {
    const m = await this.modules.findOne({ where: { id: moduleId } });
    if (!m) throw new NotFoundException('Модуль не найден');
    return m;
  }

  async listContents(moduleId: string): Promise<AdminModuleContentRow[]> {
    await this.assertModule(moduleId);
    const list = await this.contents.find({
      where: { moduleId },
      order: { order: 'ASC', id: 'ASC' },
    });
    return list.map((x) => this.contentRow(x));
  }

  async createContent(
    moduleId: string,
    dto: CreateModuleContentDto,
  ): Promise<AdminModuleContentRow> {
    await this.assertModule(moduleId);
    if (dto.type === ModuleContentType.IMAGE) {
      const fu = dto.fileUrl?.trim();
      if (!fu) {
        throw new BadRequestException(
          'Для фото укажите файл: POST /admin/modules/:moduleId/contents/from-file (multipart, поле file), либо сначала POST /admin/upload/image и вставьте fileUrl из ответа',
        );
      }
      this.assertImageFileUrl(fu);
    }
    const row = this.contents.create({
      moduleId,
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

  /**
   * Создание блока с реальным файлом на диске (без ручного ввода URL).
   * `type`: image | video | file
   */
  async createContentFromFile(
    moduleId: string,
    file: Express.Multer.File | undefined,
    kind: 'image' | 'video' | 'file',
    extra: {
      title?: string;
      order?: number;
      content?: string | null;
    },
  ): Promise<AdminModuleContentRow> {
    await this.assertModule(moduleId);
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
      moduleId,
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
    moduleId: string,
    contentId: string,
    dto: PatchModuleContentDto,
  ): Promise<AdminModuleContentRow> {
    const row = await this.contents.findOne({
      where: { id: contentId, moduleId },
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

  async deleteContent(moduleId: string, contentId: string): Promise<void> {
    const row = await this.contents.findOne({
      where: { id: contentId, moduleId },
    });
    if (!row) throw new NotFoundException('Блок контента не найден');
    await this.contents.remove(row);
  }
}
