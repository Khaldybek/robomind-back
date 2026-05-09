import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../database/entities/lesson.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { Question } from '../../database/entities/question.entity';
import { Answer } from '../../database/entities/answer.entity';
import { QuestionType } from '../../database/enums';
import {
  ApplyGeneratedQuizDto,
  CreateAdminQuizDto,
  CreateAdminQuestionDto,
  CreateAdminAnswerDto,
  PatchAdminQuizDto,
  PatchAdminQuestionDto,
  PatchAdminAnswerDto,
} from './dto/admin-quiz.dto';

@Injectable()
export class AdminQuizService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answers: Repository<Answer>,
  ) {}

  private async assertLesson(lessonId: string): Promise<Lesson> {
    const l = await this.lessons.findOne({ where: { id: lessonId } });
    if (!l) throw new NotFoundException('Урок не найден');
    return l;
  }

  /** Для school_admin: только опубликованный курс + секция + урок. */
  private async assertSchoolAdminCanReadLesson(lessonId: string): Promise<void> {
    const l = await this.lessons.findOne({
      where: { id: lessonId },
      relations: { courseModule: { course: true } },
    });
    if (!l) throw new NotFoundException('Урок не найден');
    const c = l.courseModule?.course;
    if (!c?.isPublished || !l.courseModule.isPublished || !l.isPublished) {
      throw new NotFoundException('Урок не найден');
    }
  }

  private quizToJson(q: Quiz, withQuestions = true) {
    const base = {
      id: q.id,
      lessonId: q.lessonId,
      title: q.title,
      passingScore: q.passingScore,
      maxAttempts: q.maxAttempts,
      timeLimitMinutes: q.timeLimitMinutes,
      shuffleQuestions: q.shuffleQuestions,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };
    if (!withQuestions || !q.questions) return { ...base, questions: [] };
    return {
      ...base,
      questions: [...q.questions]
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((qu) => ({
          id: qu.id,
          text: qu.text,
          type: qu.type,
          order: qu.order,
          imageUrl: qu.imageUrl,
          referenceAnswer: qu.referenceAnswer,
          gradingRubric: qu.gradingRubric,
          createdAt: qu.createdAt,
          updatedAt: qu.updatedAt,
          answers: (qu.answers || [])
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((an) => ({
              id: an.id,
              text: an.text,
              isCorrect: an.isCorrect,
              createdAt: an.createdAt,
              updatedAt: an.updatedAt,
            })),
        })),
    };
  }

  async getQuizByLesson(
    lessonId: string,
    opts?: { schoolAdminReadOnly?: boolean },
  ) {
    if (opts?.schoolAdminReadOnly) {
      await this.assertSchoolAdminCanReadLesson(lessonId);
    } else {
      await this.assertLesson(lessonId);
    }
    const q = await this.quizzes.findOne({
      where: { lessonId },
      relations: { questions: { answers: true } },
    });
    if (!q) return null;
    return this.quizToJson(q, true);
  }

  async createQuiz(lessonId: string, dto: CreateAdminQuizDto) {
    await this.assertLesson(lessonId);
    const exists = await this.quizzes.exist({ where: { lessonId } });
    if (exists) {
      throw new ConflictException('У урока уже есть тест');
    }
    const q = this.quizzes.create({
      lessonId,
      title: dto.title.trim(),
      passingScore: dto.passingScore,
      maxAttempts: dto.maxAttempts ?? 3,
      timeLimitMinutes: dto.timeLimitMinutes ?? null,
      shuffleQuestions: dto.shuffleQuestions ?? false,
    });
    await this.quizzes.save(q);
    return this.getQuizByLesson(lessonId);
  }

  async importGeneratedQuestions(lessonId: string, dto: ApplyGeneratedQuizDto) {
    if (!dto.questions?.length) {
      throw new BadRequestException('Массив questions пуст');
    }
    await this.assertLesson(lessonId);
    let quiz = await this.quizzes.findOne({ where: { lessonId } });
    if (quiz) {
      const n = await this.quizzes.manager.query(
        `SELECT COUNT(*)::int AS n FROM quiz_attempts WHERE quiz_id = $1`,
        [quiz.id],
      );
      if (Number(n[0]?.n) > 0) {
        throw new ConflictException(
          'Нельзя заменить вопросы: есть попытки прохождения теста',
        );
      }
      await this.questions.delete({ quizId: quiz.id });
      if (dto.quizTitle !== undefined) quiz.title = dto.quizTitle.trim();
      if (dto.passingScore !== undefined) quiz.passingScore = dto.passingScore;
      await this.quizzes.save(quiz);
    } else {
      quiz = this.quizzes.create({
        lessonId,
        title: dto.quizTitle?.trim() || 'Тест',
        passingScore: dto.passingScore ?? 60,
        maxAttempts: 3,
        timeLimitMinutes: null,
        shuffleQuestions: false,
      });
      await this.quizzes.save(quiz);
    }
    let order = 0;
    for (const q of dto.questions) {
      if (!q.answers?.length) {
        throw new BadRequestException('У каждого вопроса нужны ответы');
      }
      const qt =
        q.type === 'multiple' ? QuestionType.MULTIPLE : QuestionType.SINGLE;
      const qu = this.questions.create({
        quizId: quiz.id,
        text: q.text.trim(),
        type: qt,
        order: order++,
        imageUrl: null,
        referenceAnswer: null,
        gradingRubric: null,
      });
      await this.questions.save(qu);
      for (const a of q.answers) {
        const ans = this.answers.create({
          questionId: qu.id,
          text: a.text.trim(),
          isCorrect: a.isCorrect,
        });
        await this.answers.save(ans);
      }
    }
    return this.getQuizByLesson(lessonId);
  }

  async patchQuiz(quizId: string, dto: PatchAdminQuizDto) {
    const q = await this.quizzes.findOne({ where: { id: quizId } });
    if (!q) throw new NotFoundException('Тест не найден');
    if (dto.title !== undefined) q.title = dto.title.trim();
    if (dto.passingScore !== undefined) q.passingScore = dto.passingScore;
    if (dto.maxAttempts !== undefined) q.maxAttempts = dto.maxAttempts;
    if (dto.timeLimitMinutes !== undefined)
      q.timeLimitMinutes = dto.timeLimitMinutes;
    if (dto.shuffleQuestions !== undefined) {
      q.shuffleQuestions = dto.shuffleQuestions;
    }
    await this.quizzes.save(q);
    return this.getQuizByLesson(q.lessonId);
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const q = await this.quizzes.findOne({ where: { id: quizId } });
    if (!q) throw new NotFoundException('Тест не найден');
    const n = await this.quizzes.manager.query(
      `SELECT COUNT(*)::int AS n FROM quiz_attempts WHERE quiz_id = $1`,
      [quizId],
    );
    if (Number(n[0]?.n) > 0) {
      throw new ConflictException(
        'Нельзя удалить тест: есть попытки прохождения',
      );
    }
    await this.quizzes.remove(q);
  }

  async createQuestion(quizId: string, dto: CreateAdminQuestionDto) {
    const quiz = await this.quizzes.findOne({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Тест не найден');
    if (!dto.answers?.length) {
      throw new BadRequestException('Нужен хотя бы один ответ');
    }
    const qu = this.questions.create({
      quizId,
      text: dto.text.trim(),
      type: dto.type,
      order: dto.order ?? 0,
      imageUrl: dto.imageUrl?.trim() ?? null,
      referenceAnswer: dto.referenceAnswer ?? null,
      gradingRubric: dto.gradingRubric ?? null,
    });
    await this.questions.save(qu);
    for (const a of dto.answers) {
      const ans = this.answers.create({
        questionId: qu.id,
        text: a.text.trim(),
        isCorrect: a.isCorrect,
      });
      await this.answers.save(ans);
    }
    return this.getQuizByLesson(quiz.lessonId);
  }

  async patchQuestion(questionId: string, dto: PatchAdminQuestionDto) {
    const qu = await this.questions.findOne({
      where: { id: questionId },
      relations: { quiz: true },
    });
    if (!qu) throw new NotFoundException('Вопрос не найден');
    if (dto.text !== undefined) qu.text = dto.text.trim();
    if (dto.type !== undefined) qu.type = dto.type;
    if (dto.order !== undefined) qu.order = dto.order;
    if (dto.imageUrl !== undefined) {
      qu.imageUrl = dto.imageUrl === null ? null : dto.imageUrl.trim();
    }
    if (dto.referenceAnswer !== undefined) {
      qu.referenceAnswer = dto.referenceAnswer;
    }
    if (dto.gradingRubric !== undefined) {
      qu.gradingRubric = dto.gradingRubric;
    }
    await this.questions.save(qu);
    return this.getQuizByLesson(qu.quiz.lessonId);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const qu = await this.questions.findOne({
      where: { id: questionId },
      relations: { quiz: true },
    });
    if (!qu) throw new NotFoundException('Вопрос не найден');
    await this.questions.remove(qu);
  }

  async createAnswer(questionId: string, dto: CreateAdminAnswerDto) {
    const qu = await this.questions.findOne({
      where: { id: questionId },
      relations: { quiz: true },
    });
    if (!qu) throw new NotFoundException('Вопрос не найден');
    const ans = this.answers.create({
      questionId,
      text: dto.text.trim(),
      isCorrect: dto.isCorrect,
    });
    await this.answers.save(ans);
    return this.getQuizByLesson(qu.quiz.lessonId);
  }

  async patchAnswer(answerId: string, dto: PatchAdminAnswerDto) {
    const an = await this.answers.findOne({
      where: { id: answerId },
      relations: { question: { quiz: true } },
    });
    if (!an) throw new NotFoundException('Ответ не найден');
    if (dto.text !== undefined) an.text = dto.text.trim();
    if (dto.isCorrect !== undefined) an.isCorrect = dto.isCorrect;
    await this.answers.save(an);
    return this.getQuizByLesson(an.question.quiz.lessonId);
  }

  async deleteAnswer(answerId: string): Promise<void> {
    const an = await this.answers.findOne({
      where: { id: answerId },
      relations: { question: { quiz: true } },
    });
    if (!an) throw new NotFoundException('Ответ не найден');
    await this.answers.remove(an);
  }
}
