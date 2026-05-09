import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { UserQuizMaxAttemptOverride } from '../../database/entities/user-quiz-max-attempt-override.entity';
import { UserRole } from '../../database/enums';
import type { AuthUserPayload } from '../auth/decorators/current-user.decorator';
import { ListQuizAttemptLimitsQueryDto } from './dto/admin-quiz-attempt-limits.dto';

@Injectable()
export class AdminQuizAttemptLimitsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(UserQuizMaxAttemptOverride)
    private readonly overrides: Repository<UserQuizMaxAttemptOverride>,
  ) {}

  private assertTargetStudent(u: User, actor: AuthUserPayload) {
    if (u.role !== UserRole.STUDENT) {
      throw new ConflictException(
        'Лимит попыток по тесту задаётся только для учеников',
      );
    }
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!actor.schoolId || u.schoolId !== actor.schoolId) {
        throw new ForbiddenException('Нет доступа к этому пользователю');
      }
    }
  }

  async put(
    userId: string,
    quizId: string,
    maxAttempts: number,
    actor: AuthUserPayload,
  ) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    this.assertTargetStudent(u, actor);
    const quiz = await this.quizzes.findOne({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Тест не найден');
    let row = await this.overrides.findOne({ where: { userId, quizId } });
    if (row) {
      row.maxAttempts = maxAttempts;
    } else {
      row = this.overrides.create({ userId, quizId, maxAttempts });
    }
    await this.overrides.save(row);
    return {
      userId: row.userId,
      quizId: row.quizId,
      maxAttempts: row.maxAttempts,
      updatedAt: row.updatedAt,
    };
  }

  async remove(userId: string, quizId: string, actor: AuthUserPayload) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    this.assertTargetStudent(u, actor);
    const res = await this.overrides.delete({ userId, quizId });
    if (!res.affected) {
      throw new NotFoundException('Переопределение лимита не найдено');
    }
  }

  async list(
    userId: string,
    q: ListQuizAttemptLimitsQueryDto,
    actor: AuthUserPayload,
  ) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    this.assertTargetStudent(u, actor);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.overrides
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.quiz', 'q')
      .innerJoinAndSelect('q.lesson', 'l')
      .innerJoinAndSelect('l.courseModule', 'cm')
      .where('o.user_id = :uid', { uid: userId });
    if (q.courseId) {
      qb.andWhere('cm.course_id = :cid', { cid: q.courseId });
    }
    qb.orderBy('o.updatedAt', 'DESC');
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: rows.map((o) => ({
        userId: o.userId,
        quizId: o.quizId,
        maxAttempts: o.maxAttempts,
        updatedAt: o.updatedAt,
        lessonId: o.quiz.lessonId,
        courseId: o.quiz.lesson.courseModule.courseId,
        quizTitle: o.quiz.title,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
