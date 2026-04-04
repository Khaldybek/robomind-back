import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Or, MoreThan, Repository } from 'typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModuleEntity } from '../../database/entities/module.entity';
import { ModuleContent } from '../../database/entities/module-content.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { User } from '../../database/entities/user.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { Question } from '../../database/entities/question.entity';
import { Answer } from '../../database/entities/answer.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { ProgressStatus, QuestionType } from '../../database/enums';
import { PatchAppUserDto } from './dto/patch-app-user.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { PatchModuleProgressDto } from './dto/patch-module-progress.dto';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class AppStudentService {
  constructor(
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(CourseModuleEntity)
    private readonly modules: Repository<CourseModuleEntity>,
    @InjectRepository(ModuleContent)
    private readonly moduleContents: Repository<ModuleContent>,
    @InjectRepository(CourseAccess)
    private readonly courseAccess: Repository<CourseAccess>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttempts: Repository<QuizAttempt>,
    @InjectRepository(UserProgress)
    private readonly userProgress: Repository<UserProgress>,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    private readonly gamification: GamificationService,
  ) {}

  private accessWhere(userId: string) {
    return [
      { userId, revokedAt: IsNull(), expiresAt: IsNull() },
      { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    ];
  }

  async listCities() {
    const rows = await this.cities.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      nameKz: c.nameKz,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async listDistricts(cityId: string) {
    const city = await this.cities.findOne({
      where: { id: cityId, isActive: true },
    });
    if (!city) throw new NotFoundException('Город не найден');
    const rows = await this.districts.find({
      where: { cityId, isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((d) => ({
      id: d.id,
      cityId: d.cityId,
      name: d.name,
      nameKz: d.nameKz,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async listSchools(districtId: string) {
    const d = await this.districts.findOne({
      where: { id: districtId, isActive: true },
    });
    if (!d) throw new NotFoundException('Район не найден');
    const rows = await this.schools.find({
      where: { districtId, isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((s) => ({
      id: s.id,
      districtId: s.districtId,
      name: s.name,
      number: s.number,
      address: s.address,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async getMe(userId: string) {
    const u = await this.users.findOne({
      where: { id: userId },
      relations: { school: true },
    });
    if (!u) throw new NotFoundException('Пользователь не найден');
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      patronymic: u.patronymic,
      iin: u.iin,
      role: u.role,
      schoolId: u.schoolId,
      school: u.school
        ? {
            id: u.school.id,
            name: u.school.name,
            districtId: u.school.districtId,
          }
        : null,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async patchMe(userId: string, dto: PatchAppUserDto) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (dto.firstName !== undefined) u.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) u.lastName = dto.lastName.trim();
    if (dto.patronymic !== undefined)
      u.patronymic = dto.patronymic?.trim() || null;
    if (dto.avatarUrl !== undefined) {
      const v = dto.avatarUrl?.trim();
      u.avatarUrl = v || null;
    }
    await this.users.save(u);
    return this.getMe(userId);
  }

  async listMyProgress(userId: string) {
    const rows = await this.userProgress.find({
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
      updatedAt: p.updatedAt,
    }));
  }

  async listMyCertificates(userId: string) {
    const rows = await this.certificates.find({
      where: { userId },
      relations: { course: true },
      order: { issuedAt: 'DESC' },
    });
    return rows.map((c) => ({
      id: c.id,
      courseId: c.courseId,
      courseTitle: c.course?.title ?? null,
      uniqueCode: c.uniqueCode,
      issuedAt: c.issuedAt,
      pdfUrl: c.pdfUrl,
      createdAt: c.createdAt,
    }));
  }

  /** Сводка для главной: доступные курсы, прогресс, сертификаты */
  async getDashboard(userId: string) {
    const courses = await this.listCourses(userId);
    const [modulesCompleted, modulesInProgress, certificatesCount] =
      await Promise.all([
        this.userProgress.count({
          where: { userId, status: ProgressStatus.COMPLETED },
        }),
        this.userProgress.count({
          where: { userId, status: ProgressStatus.IN_PROGRESS },
        }),
        this.certificates.count({ where: { userId } }),
      ]);
    return {
      coursesCount: courses.length,
      modulesCompleted,
      modulesInProgress,
      certificatesCount,
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        thumbnailUrl: c.thumbnailUrl,
        level: c.level,
        order: c.order,
      })),
    };
  }

  async upsertModuleProgress(
    userId: string,
    moduleId: string,
    dto: PatchModuleProgressDto,
  ) {
    const mod = await this.assertModuleAccessible(userId, moduleId);
    let row = await this.userProgress.findOne({
      where: { userId, moduleId },
    });
    if (!row) {
      row = this.userProgress.create({
        userId,
        courseId: mod.courseId,
        moduleId,
        status: ProgressStatus.NOT_STARTED,
        completedAt: null,
        watchedSeconds: 0,
      });
    }

    if (dto.watchedSeconds !== undefined) {
      row.watchedSeconds = Math.max(
        row.watchedSeconds ?? 0,
        dto.watchedSeconds,
      );
      if (row.status === ProgressStatus.NOT_STARTED) {
        row.status = ProgressStatus.IN_PROGRESS;
      }
    }

    if (dto.status !== undefined) {
      row.status = dto.status;
      if (dto.status === ProgressStatus.COMPLETED) {
        row.completedAt = new Date();
      } else {
        row.completedAt = null;
      }
    }

    const wasCompleted = row.status === ProgressStatus.COMPLETED;

    if (dto.completed === true) {
      row.status = ProgressStatus.COMPLETED;
      row.completedAt = new Date();
    }

    const isNowCompleted = row.status === ProgressStatus.COMPLETED;
    await this.userProgress.save(row);

    if (!wasCompleted && isNowCompleted) {
      // Fire-and-forget: не блокируем ответ геймификационными расчётами
      void this.gamification
        .processEvent(userId, { type: 'module_completed' })
        .catch(() => undefined);
    }

    return {
      id: row.id,
      courseId: row.courseId,
      moduleId: row.moduleId,
      status: row.status,
      completedAt: row.completedAt,
      watchedSeconds: row.watchedSeconds,
      updatedAt: row.updatedAt,
    };
  }

  async assertCourseAccess(userId: string, courseId: string): Promise<void> {
    const row = await this.courseAccess.findOne({
      where: [
        { userId, courseId, revokedAt: IsNull(), expiresAt: IsNull() },
        {
          userId,
          courseId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      ],
    });
    if (!row) {
      throw new ForbiddenException('Нет доступа к этому курсу');
    }
  }

  async assertModuleAccessible(userId: string, moduleId: string) {
    const mod = await this.modules.findOne({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Модуль не найден');
    const course = await this.courses.findOne({ where: { id: mod.courseId } });
    if (!course?.isPublished) throw new NotFoundException('Курс недоступен');
    await this.assertCourseAccess(userId, mod.courseId);
    if (!mod.isPublished) {
      throw new ForbiddenException('Модуль не опубликован');
    }
    if (mod.unlockAfterModuleId) {
      const prev = await this.userProgress.findOne({
        where: {
          userId,
          moduleId: mod.unlockAfterModuleId,
          status: ProgressStatus.COMPLETED,
        },
      });
      if (!prev) {
        throw new ForbiddenException('Сначала завершите предыдущий модуль');
      }
    }
    return mod;
  }

  async listCourses(userId: string) {
    const accesses = await this.courseAccess.find({
      where: this.accessWhere(userId),
      relations: ['course'],
    });
    const seen = new Set<string>();
    const out: Course[] = [];
    for (const a of accesses) {
      const c = a.course;
      if (!c?.isPublished || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    out.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return out.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      level: c.level,
      ageGroup: c.ageGroup,
      order: c.order,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async listModules(userId: string, courseId: string) {
    await this.assertCourseAccess(userId, courseId);
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course?.isPublished) throw new NotFoundException('Курс не найден');
    const mods = await this.modules.find({
      where: { courseId, isPublished: true },
      order: { order: 'ASC', id: 'ASC' },
    });
    return {
      course: {
        id: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
      },
      modules: mods.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        order: m.order,
        unlockAfterModuleId: m.unlockAfterModuleId,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  async getModuleContent(userId: string, moduleId: string) {
    await this.assertModuleAccessible(userId, moduleId);
    const rows = await this.moduleContents.find({
      where: { moduleId },
      order: { order: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      moduleId: row.moduleId,
      type: row.type,
      title: row.title,
      content: row.content,
      fileUrl: row.fileUrl,
      duration: row.duration,
      order: row.order,
      livestreamUrl: row.livestreamUrl,
      livestreamStartsAt: row.livestreamStartsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private quizToStudentJson(q: Quiz) {
    let qs = [...(q.questions || [])].sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    );
    if (q.shuffleQuestions) qs = this.shuffle(qs);
    return {
      id: q.id,
      moduleId: q.moduleId,
      title: q.title,
      passingScore: q.passingScore,
      maxAttempts: q.maxAttempts,
      timeLimitMinutes: q.timeLimitMinutes,
      shuffleQuestions: q.shuffleQuestions,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      questions: qs.map((qu) => ({
        id: qu.id,
        text: qu.text,
        type: qu.type,
        order: qu.order,
        imageUrl: qu.imageUrl,
        answers: (qu.answers || [])
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((an) => ({
            id: an.id,
            text: an.text,
            createdAt: an.createdAt,
            updatedAt: an.updatedAt,
          })),
      })),
    };
  }

  async getModuleQuiz(userId: string, moduleId: string) {
    await this.assertModuleAccessible(userId, moduleId);
    const q = await this.quizzes.findOne({
      where: { moduleId },
      relations: { questions: { answers: true } },
    });
    if (!q) throw new NotFoundException('Тест для модуля не найден');
    return this.quizToStudentJson(q);
  }

  async startQuizAttempt(userId: string, quizId: string) {
    const quiz = await this.quizzes.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Тест не найден');
    await this.assertModuleAccessible(userId, quiz.moduleId);

    const n = await this.quizAttempts.count({ where: { quizId, userId } });
    if (n >= quiz.maxAttempts) {
      throw new BadRequestException('Исчерпан лимит попыток');
    }

    if (!quiz.questions?.length) {
      throw new BadRequestException('В тесте нет вопросов');
    }

    const active = await this.quizAttempts.findOne({
      where: { quizId, userId, completedAt: IsNull() },
    });
    if (active) {
      return {
        attemptId: active.id,
        quizId: active.quizId,
        startedAt: active.startedAt,
        maxScore: active.maxScore,
        resumed: true as const,
      };
    }

    const maxScore = quiz.questions.length;
    const attempt = this.quizAttempts.create({
      quizId,
      userId,
      score: 0,
      maxScore,
      isPassed: false,
      startedAt: new Date(),
      completedAt: null,
      answers: null,
    });
    await this.quizAttempts.save(attempt);
    return {
      attemptId: attempt.id,
      quizId: attempt.quizId,
      startedAt: attempt.startedAt,
      maxScore: attempt.maxScore,
      resumed: false as const,
    };
  }

  private gradeQuestion(q: Question, ansRows: Answer[], raw: unknown): boolean {
    if (q.type === QuestionType.TEXT) {
      const text = typeof raw === 'string' ? raw.trim() : '';
      const ref = (q.referenceAnswer ?? '').trim();
      if (!ref) return false;
      return text.toLowerCase() === ref.toLowerCase();
    }
    if (q.type === QuestionType.SINGLE) {
      const id = typeof raw === 'string' ? raw : '';
      const correct = ansRows.filter((a) => a.isCorrect).map((a) => a.id);
      return correct.length === 1 && correct[0] === id;
    }
    if (q.type === QuestionType.MULTIPLE) {
      const ids = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === 'string')
        : [];
      const correctSet = new Set(
        ansRows.filter((a) => a.isCorrect).map((a) => a.id),
      );
      const picked = new Set(ids);
      if (correctSet.size !== picked.size) return false;
      for (const id of correctSet) {
        if (!picked.has(id)) return false;
      }
      return true;
    }
    return false;
  }

  async submitQuizAttempt(
    userId: string,
    attemptId: string,
    dto: SubmitQuizAttemptDto,
  ) {
    const attempt = await this.quizAttempts.findOne({
      where: { id: attemptId, userId },
      relations: { quiz: { questions: { answers: true } } },
    });
    if (!attempt) throw new NotFoundException('Попытка не найдена');
    if (attempt.completedAt) {
      throw new BadRequestException('Попытка уже завершена');
    }

    const quiz = attempt.quiz;
    if (!quiz?.questions?.length) {
      throw new BadRequestException('Тест повреждён');
    }

    const mod = await this.assertModuleAccessible(userId, quiz.moduleId);

    if (quiz.timeLimitMinutes) {
      const deadline = new Date(
        attempt.startedAt.getTime() + quiz.timeLimitMinutes * 60 * 1000,
      );
      if (new Date() > deadline) {
        throw new BadRequestException('Время на прохождение истекло');
      }
    }

    const answersMap = dto.answers ?? {};
    let score = 0;
    const stored: Record<string, unknown> = {};

    for (const q of quiz.questions) {
      const raw = answersMap[q.id];
      stored[q.id] = raw;
      if (this.gradeQuestion(q, q.answers || [], raw)) score += 1;
    }

    const maxScore = quiz.questions.length;
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const isPassed = pct >= quiz.passingScore;

    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.isPassed = isPassed;
    attempt.completedAt = new Date();
    attempt.answers = stored;
    await this.quizAttempts.save(attempt);

    if (isPassed) {
      let prog = await this.userProgress.findOne({
        where: { userId, moduleId: quiz.moduleId },
      });
      if (!prog) {
        prog = this.userProgress.create({
          userId,
          courseId: mod.courseId,
          moduleId: quiz.moduleId,
          status: ProgressStatus.NOT_STARTED,
          completedAt: null,
          watchedSeconds: 0,
        });
      }
      prog.status = ProgressStatus.COMPLETED;
      prog.completedAt = new Date();
      await this.userProgress.save(prog);

      // Количество завершённых попыток по этому тесту (включая текущую)
      const attemptNumber = await this.quizAttempts.count({
        where: { userId, quizId: attempt.quizId },
      });
      void this.gamification
        .processEvent(userId, {
          type: 'quiz_passed',
          quizPercent: Math.round(pct * 100) / 100,
          quizAttemptNumber: attemptNumber,
        })
        .catch(() => undefined);
    }

    const percent = Math.round(pct * 100) / 100;
    return {
      attemptId: attempt.id,
      quizId: attempt.quizId,
      score,
      maxScore,
      percent,
      isPassed,
      passingScore: quiz.passingScore,
      completedAt: attempt.completedAt,
    };
  }
}
