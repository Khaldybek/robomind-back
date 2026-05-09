import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { UserQuizMaxAttemptOverride } from '../../database/entities/user-quiz-max-attempt-override.entity';
import { QuizAttemptLimitService } from './quiz-attempt-limit.service';

describe('QuizAttemptLimitService', () => {
  let service: QuizAttemptLimitService;
  let quizzes: jest.Mocked<Pick<Repository<Quiz>, 'findOne'>>;
  let courseAccess: jest.Mocked<Pick<Repository<CourseAccess>, 'findOne'>>;
  let overrides: jest.Mocked<
    Pick<Repository<UserQuizMaxAttemptOverride>, 'findOne'>
  >;

  const userId = 'u1';
  const quizId = 'q1';
  const courseId = 'c1';

  const baseQuiz = {
    id: quizId,
    maxAttempts: 3,
    lesson: {
      courseModule: {
        course: {
          id: courseId,
          defaultMaxQuizAttempts: null as number | null,
        },
      },
    },
  } as Quiz;

  beforeEach(async () => {
    quizzes = { findOne: jest.fn() };
    courseAccess = { findOne: jest.fn() };
    overrides = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizAttemptLimitService,
        { provide: getRepositoryToken(Quiz), useValue: quizzes },
        { provide: getRepositoryToken(CourseAccess), useValue: courseAccess },
        {
          provide: getRepositoryToken(UserQuizMaxAttemptOverride),
          useValue: overrides,
        },
      ],
    }).compile();

    service = module.get(QuizAttemptLimitService);
  });

  it('returns quiz default when no override, access, or course default', async () => {
    quizzes.findOne.mockResolvedValue(baseQuiz);
    overrides.findOne.mockResolvedValue(null);
    courseAccess.findOne.mockResolvedValue(null);
    await expect(
      service.getEffectiveMaxAttempts(userId, quizId),
    ).resolves.toEqual({ value: 3, source: 'quiz' });
  });

  it('override beats low quiz.maxAttempts', async () => {
    quizzes.findOne.mockResolvedValue(baseQuiz);
    overrides.findOne.mockResolvedValue({
      maxAttempts: 10,
    } as UserQuizMaxAttemptOverride);
    courseAccess.findOne.mockResolvedValue({
      maxQuizAttempts: 5,
    } as CourseAccess);
    await expect(
      service.getEffectiveMaxAttempts(userId, quizId),
    ).resolves.toEqual({ value: 10, source: 'user_quiz' });
  });

  it('throws when quiz missing', async () => {
    quizzes.findOne.mockResolvedValue(null);
    await expect(
      service.getEffectiveMaxAttempts(userId, quizId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
