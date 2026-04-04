import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan, In, Not } from 'typeorm';
import { Module as CourseModuleEntity } from '../../database/entities/module.entity';
import { ModuleHomeworkSubmission } from '../../database/entities/module-homework-submission.entity';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserRole } from '../../database/enums';
import { AdminUploadService } from '../admin-api/admin-upload.service';
import { GamificationService } from '../gamification/gamification.service';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';
import { PatchHomeworkGradeDto } from './dto/patch-homework-grade.dto';
import { ListHomeworkSubmissionsQueryDto } from './dto/list-homework-submissions.dto';

@Injectable()
export class ModuleHomeworkService {
  constructor(
    @InjectRepository(ModuleHomeworkSubmission)
    private readonly submissions: Repository<ModuleHomeworkSubmission>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(CourseModuleEntity)
    private readonly modules: Repository<CourseModuleEntity>,
    @InjectRepository(CourseAccess)
    private readonly courseAccess: Repository<CourseAccess>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttempts: Repository<QuizAttempt>,
    private readonly upload: AdminUploadService,
    private readonly gamification: GamificationService,
  ) {}

  async submitStudent(
    userId: string,
    mod: CourseModuleEntity,
    file: Express.Multer.File | undefined,
    studentComment?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Прикрепите файл (поле file)');
    }
    const meta = this.upload.homeworkFile(file);
    const comment = studentComment?.trim().slice(0, 4000) || null;

    const existing = await this.submissions.findOne({
      where: { userId, moduleId: mod.id },
    });

    const isFirstSubmission = !existing;

    if (existing) {
      existing.fileUrl = meta.url;
      existing.originalFilename = meta.originalName;
      existing.mimeType = meta.mimeType;
      existing.sizeBytes = meta.size;
      existing.studentComment = comment;
      existing.points = null;
      existing.feedback = null;
      existing.gradedAt = null;
      existing.gradedByUserId = null;
      existing.maxPoints = existing.maxPoints ?? 100;
      await this.submissions.save(existing);
      // При повторной сдаче XP и бейджи не начисляем (только за первую)
      return this.toStudentSubmissionJson(existing);
    }

    const row = this.submissions.create({
      userId,
      moduleId: mod.id,
      courseId: mod.courseId,
      fileUrl: meta.url,
      originalFilename: meta.originalName,
      mimeType: meta.mimeType,
      sizeBytes: meta.size,
      studentComment: comment,
      maxPoints: 100,
      points: null,
      feedback: null,
      gradedAt: null,
      gradedByUserId: null,
    });
    await this.submissions.save(row);

    if (isFirstSubmission) {
      void this.gamification
        .processEvent(userId, { type: 'homework_submitted' })
        .catch(() => undefined);
    }

    return this.toStudentSubmissionJson(row);
  }

  async getStudentSubmission(userId: string, moduleId: string) {
    const row = await this.submissions.findOne({
      where: { userId, moduleId },
    });
    if (!row) {
      return { submission: null };
    }
    return { submission: this.toStudentSubmissionJson(row) };
  }

  private toStudentSubmissionJson(s: ModuleHomeworkSubmission) {
    return {
      id: s.id,
      moduleId: s.moduleId,
      courseId: s.courseId,
      fileUrl: s.fileUrl,
      originalFilename: s.originalFilename,
      mimeType: s.mimeType,
      sizeBytes: s.sizeBytes,
      studentComment: s.studentComment,
      maxPoints: s.maxPoints,
      points: s.points,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private async assertCanManageModule(
    moduleId: string,
    actor: AuthUserPayload,
  ): Promise<{
    module: CourseModuleEntity;
    course: Course;
  }> {
    const module = await this.modules.findOne({ where: { id: moduleId } });
    if (!module) throw new NotFoundException('Модуль не найден');
    const course = await this.courses.findOne({
      where: { id: module.courseId },
    });
    if (!course) throw new NotFoundException('Курс не найден');
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId) {
        throw new ForbiddenException(
          'У администратора школы не задан schoolId',
        );
      }
      if (!course.isPublished) {
        throw new NotFoundException('Курс недоступен');
      }
    }
    return { module, course };
  }

  private async schoolStudentsWithCourseAccess(
    courseId: string,
    schoolId: string,
  ): Promise<User[]> {
    const accessRows = await this.courseAccess.find({
      where: [
        { courseId, revokedAt: IsNull(), expiresAt: IsNull() },
        { courseId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      ],
      relations: { user: true },
    });
    const out: User[] = [];
    const seen = new Set<string>();
    for (const a of accessRows) {
      const u = a.user;
      if (!u || seen.has(u.id)) continue;
      if (
        u.schoolId !== schoolId ||
        u.role !== UserRole.STUDENT ||
        !u.isActive
      ) {
        continue;
      }
      seen.add(u.id);
      out.push(u);
    }
    out.sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName),
    );
    return out;
  }

  async listSubmissions(
    q: ListHomeworkSubmissionsQueryDto,
    actor: AuthUserPayload,
  ) {
    const { module, course } = await this.assertCanManageModule(
      q.moduleId,
      actor,
    );

    let schoolId: string | undefined;
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      schoolId = actor.schoolId!;
    } else if (actor.role === UserRole.SUPER_ADMIN) {
      schoolId = q.schoolId;
      if (!schoolId) {
        throw new BadRequestException('Для super_admin укажите query schoolId');
      }
    } else {
      throw new ForbiddenException();
    }

    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    const qb = this.submissions
      .createQueryBuilder('h')
      .innerJoinAndSelect('h.user', 'u')
      .where('h.module_id = :mid', { mid: module.id })
      .andWhere('u.school_id = :sid', { sid: schoolId })
      .andWhere('u.role = :r', { r: UserRole.STUDENT });

    if (q.search?.trim()) {
      const p = `%${q.search.trim()}%`;
      qb.andWhere(
        '(u.email ILIKE :p OR u.first_name ILIKE :p OR u.last_name ILIKE :p OR u.iin ILIKE :p)',
        { p },
      );
    }

    qb.orderBy('h.updatedAt', 'DESC').addOrderBy('h.id', 'ASC');

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      module: {
        id: module.id,
        title: module.title,
        courseId: course.id,
        courseTitle: course.title,
      },
      items: rows.map((h) => ({
        id: h.id,
        user: {
          id: h.user.id,
          email: h.user.email,
          firstName: h.user.firstName,
          lastName: h.user.lastName,
          patronymic: h.user.patronymic,
          iin: h.user.iin,
        },
        fileUrl: h.fileUrl,
        originalFilename: h.originalFilename,
        mimeType: h.mimeType,
        sizeBytes: h.sizeBytes,
        studentComment: h.studentComment,
        maxPoints: h.maxPoints,
        points: h.points,
        feedback: h.feedback,
        gradedAt: h.gradedAt,
        gradedByUserId: h.gradedByUserId,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async patchGrade(
    submissionId: string,
    dto: PatchHomeworkGradeDto,
    actor: AuthUserPayload,
  ) {
    const h = await this.submissions.findOne({
      where: { id: submissionId },
      relations: { user: true, module: true },
    });
    if (!h) throw new NotFoundException('Сдача не найдена');

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (
        !actor.schoolId ||
        h.user.schoolId !== actor.schoolId ||
        h.user.role !== UserRole.STUDENT
      ) {
        throw new ForbiddenException('Нет доступа к этой сдаче');
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }

    const maxPoints = dto.maxPoints ?? h.maxPoints;
    if (dto.points > maxPoints) {
      throw new BadRequestException('Баллы не могут превышать maxPoints');
    }

    h.points = dto.points;
    h.maxPoints = maxPoints;
    h.feedback = dto.feedback?.trim() ?? null;
    h.gradedAt = new Date();
    h.gradedByUserId = actor.id;
    await this.submissions.save(h);

    const gradePercent =
      maxPoints > 0 ? Math.round((dto.points / maxPoints) * 100) : 0;

    // Fire-and-forget: начислить бонусный XP если оценка ≥ 80%
    void this.gamification
      .processEvent(h.userId, {
        type: 'homework_graded',
        homeworkGradePercent: gradePercent,
      })
      .catch(() => undefined);

    return {
      id: h.id,
      moduleId: h.moduleId,
      userId: h.userId,
      maxPoints: h.maxPoints,
      points: h.points,
      feedback: h.feedback,
      gradedAt: h.gradedAt,
      gradedByUserId: h.gradedByUserId,
      updatedAt: h.updatedAt,
    };
  }

  /**
   * Журнал по модулю: ученики школы с доступом к курсу + тест + домашка.
   */
  async getModuleGradeOverview(
    moduleId: string,
    actor: AuthUserPayload,
    schoolIdQuery?: string,
  ) {
    const { module, course } = await this.assertCanManageModule(
      moduleId,
      actor,
    );

    let schoolId: string;
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      schoolId = actor.schoolId!;
    } else {
      schoolId = schoolIdQuery ?? '';
      if (!schoolId) {
        throw new BadRequestException('Укажите query schoolId');
      }
    }

    const quiz = await this.quizzes.findOne({ where: { moduleId: module.id } });

    const students = await this.schoolStudentsWithCourseAccess(
      course.id,
      schoolId,
    );

    const userIds = students.map((s) => s.id);
    if (userIds.length === 0) {
      return {
        module: {
          id: module.id,
          title: module.title,
          courseId: course.id,
          courseTitle: course.title,
        },
        quiz: quiz
          ? { id: quiz.id, title: quiz.title, passingScore: quiz.passingScore }
          : null,
        rows: [],
      };
    }

    const homeworkRows =
      userIds.length > 0
        ? await this.submissions.find({
            where: { moduleId: module.id, userId: In(userIds) },
          })
        : [];
    const hwByUser = new Map(homeworkRows.map((h) => [h.userId, h]));

    let attempts: QuizAttempt[] = [];
    if (quiz && userIds.length) {
      attempts = await this.quizAttempts.find({
        where: {
          quizId: quiz.id,
          userId: In(userIds),
          completedAt: Not(IsNull()),
        },
      });
      attempts.sort(
        (a, b) =>
          b.score - a.score ||
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      );
    }
    const bestAttemptByUser = new Map<string, QuizAttempt>();
    for (const a of attempts) {
      if (!bestAttemptByUser.has(a.userId)) {
        bestAttemptByUser.set(a.userId, a);
      }
    }

    const rows = students.map((u) => {
      const hw = hwByUser.get(u.id);
      const att = bestAttemptByUser.get(u.id);
      return {
        user: {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          patronymic: u.patronymic,
          iin: u.iin,
        },
        quiz: att
          ? {
              attemptId: att.id,
              score: att.score,
              maxScore: att.maxScore,
              isPassed: att.isPassed,
              completedAt: att.completedAt,
            }
          : null,
        homework: hw
          ? {
              submissionId: hw.id,
              fileUrl: hw.fileUrl,
              originalFilename: hw.originalFilename,
              maxPoints: hw.maxPoints,
              points: hw.points,
              feedback: hw.feedback,
              gradedAt: hw.gradedAt,
              updatedAt: hw.updatedAt,
            }
          : null,
      };
    });

    return {
      module: {
        id: module.id,
        title: module.title,
        courseId: course.id,
        courseTitle: course.title,
      },
      quiz: quiz
        ? { id: quiz.id, title: quiz.title, passingScore: quiz.passingScore }
        : null,
      rows,
    };
  }
}
