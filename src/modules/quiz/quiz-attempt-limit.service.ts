import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { UserQuizMaxAttemptOverride } from '../../database/entities/user-quiz-max-attempt-override.entity';

export type QuizMaxAttemptsSource =
  | 'user_quiz'
  | 'course_access'
  | 'course_default'
  | 'quiz';

export interface EffectiveQuizMaxAttempts {
  value: number;
  source: QuizMaxAttemptsSource;
}

@Injectable()
export class QuizAttemptLimitService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(CourseAccess)
    private readonly courseAccess: Repository<CourseAccess>,
    @InjectRepository(UserQuizMaxAttemptOverride)
    private readonly overrides: Repository<UserQuizMaxAttemptOverride>,
  ) {}

  private accessWhere(userId: string, courseId: string) {
    return [
      {
        userId,
        courseId,
        revokedAt: IsNull(),
        expiresAt: IsNull(),
      },
      {
        userId,
        courseId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    ];
  }

  /**
   * Приоритет: user+quiz override → лимит на course_access → default курса → quizzes.max_attempts.
   */
  async getEffectiveMaxAttempts(
    userId: string,
    quizId: string,
  ): Promise<EffectiveQuizMaxAttempts> {
    const quiz = await this.quizzes.findOne({
      where: { id: quizId },
      relations: { lesson: { courseModule: { course: true } } },
    });
    if (!quiz?.lesson?.courseModule?.course) {
      throw new NotFoundException('Тест не найден');
    }
    const course = quiz.lesson.courseModule.course;
    const courseId = course.id;

    const [overrideRow, access] = await Promise.all([
      this.overrides.findOne({ where: { userId, quizId } }),
      this.courseAccess.findOne({
        where: this.accessWhere(userId, courseId),
      }),
    ]);

    if (overrideRow) {
      return { value: overrideRow.maxAttempts, source: 'user_quiz' };
    }
    if (access?.maxQuizAttempts != null) {
      return { value: access.maxQuizAttempts, source: 'course_access' };
    }
    if (course.defaultMaxQuizAttempts != null) {
      return {
        value: course.defaultMaxQuizAttempts,
        source: 'course_default',
      };
    }
    return { value: quiz.maxAttempts, source: 'quiz' };
  }
}
