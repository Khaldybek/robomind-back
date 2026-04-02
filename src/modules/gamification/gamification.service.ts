import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGamification } from '../../database/entities/user-gamification.entity';
import { UserBadge } from '../../database/entities/user-badge.entity';
import { UserProgress } from '../../database/entities/user-progress.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { User } from '../../database/entities/user.entity';
import { BadgeKey, ProgressStatus } from '../../database/enums';

// ─── XP Awards ───────────────────────────────────────────────────────────────
export const XP = {
  MODULE_COMPLETED: 20,
  QUIZ_PASSED: 50,
  QUIZ_PERFECT_BONUS: 30,         // score === 100 %
  QUIZ_FIRST_ATTEMPT_BONUS: 30,   // passed on 1st attempt for that quiz
  COURSE_COMPLETED: 100,
  STREAK_DAILY: 5,
  HOMEWORK_SUBMITTED: 10,
  HOMEWORK_EXCELLENT_BONUS: 25,   // grade >= 80 % of maxPoints
} as const;

// ─── Level thresholds (index = level, starts at level 1) ─────────────────────
//      Lv:  0   1    2    3     4     5     6     7     8      9     10
export const LEVEL_THRESHOLDS = [
  0, 0, 100, 300, 600, 1000, 1600, 2400, 3600, 5400, 8000,
  //  11     12     13     14      15      16      17      18       19      20
  11_500, 16_000, 22_000, 30_000, 40_000, 52_000, 67_000, 85_000, 107_000, 135_000,
] as const;

export function xpToLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 1; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

export function nextLevelXp(level: number): number | null {
  const next = level + 1;
  return next < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[next] : null;
}

// ─── Badge metadata ───────────────────────────────────────────────────────────
export const BADGE_META: Record<
  BadgeKey,
  { title: string; description: string; icon: string }
> = {
  // Модули
  [BadgeKey.FIRST_MODULE]: {
    title: 'Первый шаг',
    description: 'Завершить первый модуль',
    icon: '🎯',
  },
  [BadgeKey.MODULES_10]: {
    title: '10 модулей',
    description: 'Завершить 10 модулей',
    icon: '📚',
  },
  [BadgeKey.MODULES_50]: {
    title: '50 модулей',
    description: 'Завершить 50 модулей',
    icon: '🏆',
  },
  // Тесты
  [BadgeKey.FIRST_QUIZ_PASSED]: {
    title: 'Тестовый прорыв',
    description: 'Сдать первый тест',
    icon: '✅',
  },
  [BadgeKey.QUIZ_PERFECT]: {
    title: 'Идеальный результат',
    description: 'Сдать тест на 100%',
    icon: '💯',
  },
  [BadgeKey.FIRST_ATTEMPT_PASS]: {
    title: 'С первого раза',
    description: 'Сдать тест с первой попытки',
    icon: '⚡',
  },
  [BadgeKey.QUIZZES_5]: {
    title: '5 тестов',
    description: 'Сдать 5 тестов',
    icon: '🎓',
  },
  [BadgeKey.QUIZ_MASTER]: {
    title: 'Мастер тестов',
    description: 'Сдать 10 тестов',
    icon: '🧠',
  },
  // Курсы
  [BadgeKey.FIRST_COURSE]: {
    title: 'Выпускник',
    description: 'Получить сертификат по первому курсу',
    icon: '🎓',
  },
  [BadgeKey.COURSES_3]: {
    title: 'Многопрофильный',
    description: 'Получить сертификаты по 3 курсам',
    icon: '🌟',
  },
  // Домашние задания
  [BadgeKey.HOMEWORK_FIRST]: {
    title: 'Первое ДЗ',
    description: 'Сдать первое домашнее задание',
    icon: '📝',
  },
  [BadgeKey.HOMEWORK_5]: {
    title: '5 работ сдано',
    description: 'Сдать 5 домашних заданий',
    icon: '📋',
  },
  [BadgeKey.HOMEWORK_EXCELLENT]: {
    title: 'Отличник',
    description: 'Получить оценку ≥ 80% за домашнее задание',
    icon: '⭐',
  },
  // Серии
  [BadgeKey.STREAK_3]: {
    title: '3 дня подряд',
    description: 'Заниматься 3 дня подряд',
    icon: '🔥',
  },
  [BadgeKey.STREAK_7]: {
    title: 'Неделя без перерыва',
    description: 'Заниматься 7 дней подряд',
    icon: '🔥🔥',
  },
  [BadgeKey.STREAK_30]: {
    title: 'Месяц упорства',
    description: 'Заниматься 30 дней подряд',
    icon: '🔥🔥🔥',
  },
};

// ─── Badge progress hints (для тех бейджей, где есть числовой прогресс) ──────
export type BadgeProgressHint = {
  key: BadgeKey;
  title: string;
  icon: string;
  current: number;
  target: number;
  percent: number;
};

// ─── Events ──────────────────────────────────────────────────────────────────
export interface GamificationEvent {
  type:
    | 'module_completed'
    | 'quiz_passed'
    | 'course_completed'
    | 'homework_submitted'
    | 'homework_graded';
  quizPercent?: number;
  quizAttemptNumber?: number;
  /** Для homework_graded: grade / maxPoints * 100 */
  homeworkGradePercent?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(UserGamification)
    private readonly gamRepo: Repository<UserGamification>,
    @InjectRepository(UserBadge)
    private readonly badgeRepo: Repository<UserBadge>,
    @InjectRepository(UserProgress)
    private readonly progressRepo: Repository<UserProgress>,
    @InjectRepository(QuizAttempt)
    private readonly attemptsRepo: Repository<QuizAttempt>,
    @InjectRepository(Certificate)
    private readonly certsRepo: Repository<Certificate>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // ── Core ───────────────────────────────────────────────────────────────────

  async getOrCreate(userId: string): Promise<UserGamification> {
    let row = await this.gamRepo.findOne({ where: { userId } });
    if (!row) {
      row = this.gamRepo.create({
        userId,
        xp: 0,
        level: 1,
        streakDays: 0,
        lastActivityAt: null,
      });
      await this.gamRepo.save(row);
    }
    return row;
  }

  async addXp(userId: string, amount: number): Promise<UserGamification> {
    const row = await this.getOrCreate(userId);
    row.xp = Math.max(0, row.xp + amount);
    row.level = xpToLevel(row.xp);
    await this.gamRepo.save(row);
    return row;
  }

  async updateStreak(
    userId: string,
  ): Promise<{ streakDays: number; newBadges: BadgeKey[] }> {
    const row = await this.getOrCreate(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let changed = false;
    if (row.lastActivityAt) {
      const last = new Date(
        row.lastActivityAt.getFullYear(),
        row.lastActivityAt.getMonth(),
        row.lastActivityAt.getDate(),
      );
      const diffDays = Math.round(
        (today.getTime() - last.getTime()) / 86_400_000,
      );
      if (diffDays === 0) {
        return { streakDays: row.streakDays, newBadges: [] };
      } else if (diffDays === 1) {
        row.streakDays += 1;
        changed = true;
      } else {
        row.streakDays = 1;
        changed = true;
      }
    } else {
      row.streakDays = 1;
      changed = true;
    }

    row.lastActivityAt = now;
    if (changed) {
      row.xp += XP.STREAK_DAILY;
      row.level = xpToLevel(row.xp);
    }
    await this.gamRepo.save(row);

    const newBadges = await this.checkStreakBadges(userId, row.streakDays);
    return { streakDays: row.streakDays, newBadges };
  }

  // ── Central event handler ─────────────────────────────────────────────────

  async processEvent(
    userId: string,
    event: GamificationEvent,
  ): Promise<{ xpGained: number; newBadges: BadgeKey[] }> {
    let xpGained = 0;
    const newBadges: BadgeKey[] = [];

    const { newBadges: streakBadges } = await this.updateStreak(userId);
    newBadges.push(...streakBadges);

    if (event.type === 'module_completed') {
      xpGained += XP.MODULE_COMPLETED;
      await this.addXp(userId, XP.MODULE_COMPLETED);
      newBadges.push(...(await this.checkModuleBadges(userId)));
    }

    if (event.type === 'quiz_passed') {
      let quizXp = XP.QUIZ_PASSED;
      if ((event.quizPercent ?? 0) === 100) quizXp += XP.QUIZ_PERFECT_BONUS;
      if ((event.quizAttemptNumber ?? 1) === 1)
        quizXp += XP.QUIZ_FIRST_ATTEMPT_BONUS;
      xpGained += quizXp;
      await this.addXp(userId, quizXp);
      newBadges.push(...(await this.checkQuizBadges(userId, event)));
    }

    if (event.type === 'course_completed') {
      xpGained += XP.COURSE_COMPLETED;
      await this.addXp(userId, XP.COURSE_COMPLETED);
      newBadges.push(...(await this.checkCourseBadges(userId)));
    }

    if (event.type === 'homework_submitted') {
      xpGained += XP.HOMEWORK_SUBMITTED;
      await this.addXp(userId, XP.HOMEWORK_SUBMITTED);
      newBadges.push(...(await this.checkHomeworkBadges(userId, event)));
    }

    if (event.type === 'homework_graded') {
      const pct = event.homeworkGradePercent ?? 0;
      if (pct >= 80) {
        xpGained += XP.HOMEWORK_EXCELLENT_BONUS;
        await this.addXp(userId, XP.HOMEWORK_EXCELLENT_BONUS);
        newBadges.push(
          ...(await this.awardBadgeIfNew(userId, BadgeKey.HOMEWORK_EXCELLENT)),
        );
      }
    }

    return { xpGained, newBadges };
  }

  // ── Badge checks ──────────────────────────────────────────────────────────

  private async awardBadgeIfNew(
    userId: string,
    key: BadgeKey,
  ): Promise<BadgeKey[]> {
    const exists = await this.badgeRepo.findOne({
      where: { userId, badgeKey: key },
    });
    if (exists) return [];
    await this.badgeRepo.save(this.badgeRepo.create({ userId, badgeKey: key }));
    return [key];
  }

  private async checkModuleBadges(userId: string): Promise<BadgeKey[]> {
    const total = await this.progressRepo.count({
      where: { userId, status: ProgressStatus.COMPLETED },
    });
    const badges: BadgeKey[] = [];
    if (total >= 1)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.FIRST_MODULE)));
    if (total >= 10)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.MODULES_10)));
    if (total >= 50)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.MODULES_50)));
    return badges;
  }

  private async checkQuizBadges(
    userId: string,
    event: GamificationEvent,
  ): Promise<BadgeKey[]> {
    const badges: BadgeKey[] = [];
    const passedTotal = await this.attemptsRepo.count({
      where: { userId, isPassed: true },
    });

    if (passedTotal >= 1)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.FIRST_QUIZ_PASSED)),
      );
    if (passedTotal >= 5)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.QUIZZES_5)));
    if (passedTotal >= 10)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.QUIZ_MASTER)),
      );

    if ((event.quizPercent ?? 0) === 100)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.QUIZ_PERFECT)),
      );
    if ((event.quizAttemptNumber ?? 1) === 1)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.FIRST_ATTEMPT_PASS)),
      );

    return badges;
  }

  private async checkCourseBadges(userId: string): Promise<BadgeKey[]> {
    const badges: BadgeKey[] = [];
    const certsTotal = await this.certsRepo.count({ where: { userId } });
    if (certsTotal >= 1)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.FIRST_COURSE)),
      );
    if (certsTotal >= 3)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.COURSES_3)),
      );
    return badges;
  }

  private async checkHomeworkBadges(
    userId: string,
    _event: GamificationEvent,
  ): Promise<BadgeKey[]> {
    const badges: BadgeKey[] = [];
    // Считаем по userId из репозитория напрямую через raw запрос
    // (ModuleHomeworkSubmission не инжектирован в этом сервисе,
    //  поэтому используем поле progressRepo как прокси нет — делаем через
    //  gamRepo raw query)
    const [{ count }] = await this.gamRepo.query(
      `SELECT COUNT(*) AS count FROM module_homework_submissions WHERE user_id = $1`,
      [userId],
    ) as [{ count: string }];
    const total = parseInt(count, 10);
    if (total >= 1)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.HOMEWORK_FIRST)),
      );
    if (total >= 5)
      badges.push(
        ...(await this.awardBadgeIfNew(userId, BadgeKey.HOMEWORK_5)),
      );
    return badges;
  }

  private async checkStreakBadges(
    userId: string,
    streakDays: number,
  ): Promise<BadgeKey[]> {
    const badges: BadgeKey[] = [];
    if (streakDays >= 3)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.STREAK_3)));
    if (streakDays >= 7)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.STREAK_7)));
    if (streakDays >= 30)
      badges.push(...(await this.awardBadgeIfNew(userId, BadgeKey.STREAK_30)));
    return badges;
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const row = await this.getOrCreate(userId);
    const badges = await this.badgeRepo.find({
      where: { userId },
      order: { earnedAt: 'ASC' },
    });
    const earnedKeys = new Set(badges.map((b) => b.badgeKey));

    const nextXp = nextLevelXp(row.level);
    const currentLevelXp = LEVEL_THRESHOLDS[row.level] ?? 0;
    const xpInLevel = row.xp - currentLevelXp;
    const xpNeeded = nextXp !== null ? nextXp - currentLevelXp : null;

    // Прогресс по незаработанным бейджам с числовым условием
    const progressHints = await this.buildProgressHints(userId, earnedKeys, row);

    return {
      xp: row.xp,
      level: row.level,
      nextLevelXp: nextXp,
      xpInCurrentLevel: xpInLevel,
      xpNeededForNextLevel: xpNeeded,
      /** Процент заполненности текущего уровня (0–100) */
      levelProgressPercent:
        xpNeeded !== null && xpNeeded > 0
          ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
          : 100,
      streakDays: row.streakDays,
      lastActivityAt: row.lastActivityAt,
      badges: badges.map((b) => ({
        key: b.badgeKey,
        earnedAt: b.earnedAt,
        title: BADGE_META[b.badgeKey].title,
        description: BADGE_META[b.badgeKey].description,
        icon: BADGE_META[b.badgeKey].icon,
      })),
      /** Подсказки: насколько близко к следующим бейджам */
      progressHints,
    };
  }

  private async buildProgressHints(
    userId: string,
    earned: Set<BadgeKey>,
    row: UserGamification,
  ): Promise<BadgeProgressHint[]> {
    const hints: BadgeProgressHint[] = [];

    const add = (
      key: BadgeKey,
      current: number,
      target: number,
    ) => {
      if (earned.has(key)) return;
      hints.push({
        key,
        title: BADGE_META[key].title,
        icon: BADGE_META[key].icon,
        current: Math.min(current, target),
        target,
        percent: Math.min(100, Math.round((current / target) * 100)),
      });
    };

    // Модули
    const modulesCompleted = await this.progressRepo.count({
      where: { userId, status: ProgressStatus.COMPLETED },
    });
    add(BadgeKey.FIRST_MODULE, modulesCompleted, 1);
    add(BadgeKey.MODULES_10, modulesCompleted, 10);
    add(BadgeKey.MODULES_50, modulesCompleted, 50);

    // Тесты
    const quizzesPassed = await this.attemptsRepo.count({
      where: { userId, isPassed: true },
    });
    add(BadgeKey.FIRST_QUIZ_PASSED, quizzesPassed, 1);
    add(BadgeKey.QUIZZES_5, quizzesPassed, 5);
    add(BadgeKey.QUIZ_MASTER, quizzesPassed, 10);

    // Курсы
    const certsTotal = await this.certsRepo.count({ where: { userId } });
    add(BadgeKey.FIRST_COURSE, certsTotal, 1);
    add(BadgeKey.COURSES_3, certsTotal, 3);

    // Домашки
    const [{ count: hwCountStr }] = await this.gamRepo.query(
      `SELECT COUNT(*) AS count FROM module_homework_submissions WHERE user_id = $1`,
      [userId],
    ) as [{ count: string }];
    const hwTotal = parseInt(hwCountStr, 10);
    add(BadgeKey.HOMEWORK_FIRST, hwTotal, 1);
    add(BadgeKey.HOMEWORK_5, hwTotal, 5);

    // Стрики
    add(BadgeKey.STREAK_3, row.streakDays, 3);
    add(BadgeKey.STREAK_7, row.streakDays, 7);
    add(BadgeKey.STREAK_30, row.streakDays, 30);

    // Сортируем по убыванию процента — ближайшее наверху
    hints.sort((a, b) => b.percent - a.percent);

    return hints;
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────

  async getLeaderboard(schoolId?: string, limit = 20) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .innerJoin('user_gamification', 'g', 'g.user_id = u.id')
      .select([
        'u.id AS id',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
        'u.avatar_url AS "avatarUrl"',
        'g.xp AS xp',
        'g.level AS level',
        'g.streak_days AS "streakDays"',
      ])
      .where('u.is_active = true AND u.role = :role', { role: 'student' })
      .orderBy('g.xp', 'DESC')
      .limit(limit);

    if (schoolId) {
      qb.andWhere('u.school_id = :schoolId', { schoolId });
    }

    const rows = await qb.getRawMany<{
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      xp: string;
      level: string;
      streakDays: string;
    }>();

    return rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      avatarUrl: r.avatarUrl,
      xp: parseInt(r.xp, 10),
      level: parseInt(r.level, 10),
      streakDays: parseInt(r.streakDays, 10),
    }));
  }

  /** Позиция конкретного студента в рейтинге своей школы */
  async getMyRank(userId: string, schoolId?: string): Promise<{
    rank: number | null;
    total: number;
    xp: number;
    level: number;
    streakDays: number;
  }> {
    const row = await this.getOrCreate(userId);

    const [{ rank, total }] = schoolId
      ? await this.gamRepo.query(
          `
      SELECT
        (SELECT COUNT(*) + 1 FROM users u2
           INNER JOIN user_gamification g2 ON g2.user_id = u2.id
           WHERE u2.is_active = true AND u2.role = 'student'
           AND u2.school_id = $2
           AND g2.xp > $1) AS rank,
        (SELECT COUNT(*) FROM users u3
           INNER JOIN user_gamification g3 ON g3.user_id = u3.id
           WHERE u3.is_active = true AND u3.role = 'student'
           AND u3.school_id = $2) AS total
      `,
          [row.xp, schoolId],
        )
      : await this.gamRepo.query(
          `
      SELECT
        (SELECT COUNT(*) + 1 FROM users u2
           INNER JOIN user_gamification g2 ON g2.user_id = u2.id
           WHERE u2.is_active = true AND u2.role = 'student'
           AND g2.xp > $1) AS rank,
        (SELECT COUNT(*) FROM users u3
           INNER JOIN user_gamification g3 ON g3.user_id = u3.id
           WHERE u3.is_active = true AND u3.role = 'student') AS total
      `,
          [row.xp],
        );

    return {
      rank: parseInt(rank, 10) || null,
      total: parseInt(total, 10),
      xp: row.xp,
      level: row.level,
      streakDays: row.streakDays,
    };
  }
}
