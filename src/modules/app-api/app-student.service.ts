import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Or, MoreThan, Repository } from 'typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { LessonContent } from '../../database/entities/lesson-content.entity';
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
import { AdminUploadService } from '../admin-api/admin-upload.service';
import {
  QuizAttemptLimitService,
  type EffectiveQuizMaxAttempts,
} from '../quiz/quiz-attempt-limit.service';
import {
  pickLocalized,
  textAnswerMatchesReferences,
  type QuizDisplayLang,
} from '../quiz/quiz-locale.util';

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
    @InjectRepository(CourseModule)
    private readonly courseModules: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonContent)
    private readonly lessonContents: Repository<LessonContent>,
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
    private readonly upload: AdminUploadService,
    private readonly quizAttemptLimits: QuizAttemptLimitService,
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

  /** Расширенный профиль студента: базовые данные + курсы + сертификаты + успеваемость */
  async getMeProfile(userId: string) {
    const [me, courses, certificates, progressRows, attempts] = await Promise.all([
      this.getMe(userId),
      this.listCourses(userId),
      this.listMyCertificates(userId),
      this.userProgress.find({ where: { userId } }),
      this.quizAttempts.find({ where: { userId } }),
    ]);

    const courseIds = courses.map((c) => c.id);
    const publishedLessons =
      courseIds.length > 0
        ? await this.lessons.find({
            where: {
              isPublished: true,
              courseModule: { courseId: In(courseIds) },
            },
            relations: ['courseModule'],
          })
        : [];

    const lessonsByCourse = new Map<string, string[]>();
    for (const l of publishedLessons) {
      const cid = l.courseModule.courseId;
      const arr = lessonsByCourse.get(cid) ?? [];
      arr.push(l.id);
      lessonsByCourse.set(cid, arr);
    }

    const completedLessonIds = new Set(
      progressRows
        .filter((p) => p.status === ProgressStatus.COMPLETED)
        .map((p) => p.lessonId),
    );
    const inProgressLessonIds = new Set(
      progressRows
        .filter((p) => p.status === ProgressStatus.IN_PROGRESS)
        .map((p) => p.lessonId),
    );

    const courseProgress = courses.map((c) => {
      const lessonIds = lessonsByCourse.get(c.id) ?? [];
      const totalLessons = lessonIds.length;
      const completedLessons = lessonIds.filter((id) =>
        completedLessonIds.has(id),
      ).length;
      const lessonsInProgress = lessonIds.filter((id) =>
        inProgressLessonIds.has(id),
      ).length;
      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 1000) / 10
          : 0;
      return {
        ...c,
        totalLessons,
        completedLessons,
        lessonsInProgress,
        progressPercent,
      };
    });

    const totalLessons = publishedLessons.length;
    const lessonsCompleted = publishedLessons.filter((l) =>
      completedLessonIds.has(l.id),
    ).length;
    const lessonsInProgressCount = publishedLessons.filter((l) =>
      inProgressLessonIds.has(l.id),
    ).length;
    const overallProgressPercent =
      totalLessons > 0
        ? Math.round((lessonsCompleted / totalLessons) * 1000) / 10
        : 0;

    const completedAttempts = attempts.filter(
      (a) => a.completedAt && a.maxScore > 0,
    );
    const averageQuizPercent =
      completedAttempts.length > 0
        ? Math.round(
            (completedAttempts.reduce(
              (sum, a) => sum + (a.score / a.maxScore) * 100,
              0,
            ) /
              completedAttempts.length) *
              10,
          ) / 10
        : null;

    return {
      ...me,
      certificates,
      courses: courseProgress,
      performance: {
        coursesCount: courses.length,
        certificatesCount: certificates.length,
        totalLessons,
        lessonsCompleted,
        lessonsInProgress: lessonsInProgressCount,
        overallProgressPercent,
        totalQuizAttempts: attempts.length,
        averageQuizPercent,
      },
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

  /** Загрузка нового аватара файлом (multipart: field `file`) */
  async uploadMyAvatar(userId: string, file: Express.Multer.File | undefined) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    const meta = this.upload.image(file);
    u.avatarUrl = meta.url;
    await this.users.save(u);
    return this.getMe(userId);
  }

  async listMyProgress(userId: string) {
    const rows = await this.userProgress.find({
      where: { userId },
      relations: { course: true, lesson: true },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      courseTitle: p.course?.title ?? null,
      lessonId: p.lessonId,
      lessonTitle: p.lesson?.title ?? null,
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
    const [lessonsCompleted, lessonsInProgress, certificatesCount] =
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
      lessonsCompleted,
      lessonsInProgress,
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

  async upsertLessonProgress(
    userId: string,
    lessonId: string,
    dto: PatchModuleProgressDto,
  ) {
    const lesson = await this.assertLessonAccessible(userId, lessonId);
    const courseId = lesson.courseModule.courseId;
    let row = await this.userProgress.findOne({
      where: { userId, lessonId },
    });
    if (!row) {
      row = this.userProgress.create({
        userId,
        courseId,
        lessonId,
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
      void this.gamification
        .processEvent(userId, { type: 'lesson_completed' })
        .catch(() => undefined);
    }

    return {
      id: row.id,
      courseId: row.courseId,
      lessonId: row.lessonId,
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

  async assertLessonAccessible(userId: string, lessonId: string) {
    const lesson = await this.lessons.findOne({
      where: { id: lessonId },
      relations: { courseModule: { course: true } },
    });
    if (!lesson) throw new NotFoundException('Урок не найден');
    const course = lesson.courseModule.course;
    if (!course?.isPublished) throw new NotFoundException('Курс недоступен');
    const courseId = lesson.courseModule.courseId;
    await this.assertCourseAccess(userId, courseId);
    if (!lesson.courseModule.isPublished) {
      throw new ForbiddenException('Модуль курса не опубликован');
    }
    if (!lesson.isPublished) {
      throw new ForbiddenException('Урок не опубликован');
    }
    if (lesson.courseModule.unlockAfterCourseModuleId) {
      const prevCmId = lesson.courseModule.unlockAfterCourseModuleId;
      const prevLessons = await this.lessons.find({
        where: { courseModuleId: prevCmId, isPublished: true },
        select: { id: true },
      });
      if (prevLessons.length > 0) {
        const done = await this.userProgress.count({
          where: {
            userId,
            status: ProgressStatus.COMPLETED,
            lessonId: In(prevLessons.map((x) => x.id)),
          },
        });
        if (done < prevLessons.length) {
          throw new ForbiddenException(
            'Сначала завершите предыдущий модуль курса',
          );
        }
      }
    }
    if (lesson.unlockAfterLessonId) {
      const prev = await this.userProgress.findOne({
        where: {
          userId,
          lessonId: lesson.unlockAfterLessonId,
          status: ProgressStatus.COMPLETED,
        },
      });
      if (!prev) {
        throw new ForbiddenException('Сначала завершите предыдущий урок');
      }
    }
    return lesson;
  }

  async assertCourseModuleAccessible(userId: string, courseModuleId: string) {
    const cm = await this.courseModules.findOne({
      where: { id: courseModuleId },
      relations: { course: true },
    });
    if (!cm) throw new NotFoundException('Модуль курса не найден');
    if (!cm.course?.isPublished) throw new NotFoundException('Курс недоступен');
    await this.assertCourseAccess(userId, cm.courseId);
    if (!cm.isPublished) {
      throw new ForbiddenException('Модуль курса не опубликован');
    }
    if (cm.unlockAfterCourseModuleId) {
      const prevLessons = await this.lessons.find({
        where: {
          courseModuleId: cm.unlockAfterCourseModuleId,
          isPublished: true,
        },
        select: { id: true },
      });
      if (prevLessons.length > 0) {
        const done = await this.userProgress.count({
          where: {
            userId,
            status: ProgressStatus.COMPLETED,
            lessonId: In(prevLessons.map((x) => x.id)),
          },
        });
        if (done < prevLessons.length) {
          throw new ForbiddenException(
            'Сначала завершите предыдущий модуль курса',
          );
        }
      }
    }
    return cm;
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

  /** Секции курса (модули курса) */
  async listCourseModules(userId: string, courseId: string) {
    await this.assertCourseAccess(userId, courseId);
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course?.isPublished) throw new NotFoundException('Курс не найден');
    const mods = await this.courseModules.find({
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
        unlockAfterCourseModuleId: m.unlockAfterCourseModuleId,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  async listLessonsInCourseModule(userId: string, courseModuleId: string) {
    await this.assertCourseModuleAccessible(userId, courseModuleId);
    const list = await this.lessons.find({
      where: { courseModuleId, isPublished: true },
      order: { order: 'ASC', id: 'ASC' },
    });
    return {
      courseModuleId,
      lessons: list.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        order: l.order,
        unlockAfterLessonId: l.unlockAfterLessonId,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
    };
  }

  async getLessonContent(userId: string, lessonId: string) {
    await this.assertLessonAccessible(userId, lessonId);
    const rows = await this.lessonContents.find({
      where: { lessonId },
      order: { order: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      lessonId: row.lessonId,
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

  private quizToStudentJson(
    q: Quiz,
    effective: EffectiveQuizMaxAttempts | undefined,
    lang: QuizDisplayLang,
  ) {
    let qs = [...(q.questions || [])].sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    );
    if (q.shuffleQuestions) qs = this.shuffle(qs);
    const maxAttempts = effective?.value ?? q.maxAttempts;
    const maxAttemptsSource = effective?.source;
    return {
      id: q.id,
      lessonId: q.lessonId,
      title: pickLocalized(q.title, q.titleKz, lang),
      language: lang,
      passingScore: q.passingScore,
      maxAttempts,
      ...(maxAttemptsSource != null ? { maxAttemptsSource } : {}),
      timeLimitMinutes: q.timeLimitMinutes,
      shuffleQuestions: q.shuffleQuestions,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      questions: qs.map((qu) => ({
        id: qu.id,
        text: pickLocalized(qu.text, qu.textKz, lang),
        type: qu.type,
        order: qu.order,
        imageUrl: qu.imageUrl,
        answers: (qu.answers || [])
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((an) => ({
            id: an.id,
            text: pickLocalized(an.text, an.textKz, lang),
            createdAt: an.createdAt,
            updatedAt: an.updatedAt,
          })),
      })),
    };
  }

  async getLessonQuiz(
    userId: string,
    lessonId: string,
    lang: QuizDisplayLang = 'ru',
  ) {
    await this.assertLessonAccessible(userId, lessonId);
    const q = await this.quizzes.findOne({
      where: { lessonId },
      relations: { questions: { answers: true } },
    });
    if (!q) throw new NotFoundException('Тест для урока не найден');
    const effective = await this.quizAttemptLimits.getEffectiveMaxAttempts(
      userId,
      q.id,
    );
    return this.quizToStudentJson(q, effective, lang);
  }

  async startQuizAttempt(userId: string, quizId: string) {
    const quiz = await this.quizzes.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Тест не найден');
    await this.assertLessonAccessible(userId, quiz.lessonId);

    const effective = await this.quizAttemptLimits.getEffectiveMaxAttempts(
      userId,
      quizId,
    );
    const n = await this.quizAttempts.count({ where: { quizId, userId } });
    if (n >= effective.value) {
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
      return textAnswerMatchesReferences(
        raw,
        q.referenceAnswer,
        q.referenceAnswerKz,
      );
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

    const lesson = await this.assertLessonAccessible(userId, quiz.lessonId);
    const courseId = lesson.courseModule.courseId;

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
        where: { userId, lessonId: quiz.lessonId },
      });
      if (!prog) {
        prog = this.userProgress.create({
          userId,
          courseId,
          lessonId: quiz.lessonId,
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
