export enum UserRole {
  STUDENT = 'student',
  SCHOOL_ADMIN = 'school_admin',
  SUPER_ADMIN = 'super_admin',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseAccessType {
  PERMANENT = 'permanent',
  TEMPORARY = 'temporary',
}

export enum ModuleContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  FILE = 'file',
  TEXT = 'text',
  LIVESTREAM = 'livestream',
  LINK = 'link',
}

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  TEXT = 'text',
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum BadgeKey {
  // Модули
  FIRST_MODULE = 'first_module',
  MODULES_10 = 'modules_10',
  MODULES_50 = 'modules_50',
  // Тесты
  FIRST_QUIZ_PASSED = 'first_quiz_passed',
  QUIZ_PERFECT = 'quiz_perfect',
  FIRST_ATTEMPT_PASS = 'first_attempt_pass',
  QUIZZES_5 = 'quizzes_5',
  QUIZ_MASTER = 'quiz_master',
  // Курсы
  FIRST_COURSE = 'first_course',
  COURSES_3 = 'courses_3',
  // Домашние задания
  HOMEWORK_FIRST = 'homework_first',
  HOMEWORK_EXCELLENT = 'homework_excellent',
  HOMEWORK_5 = 'homework_5',
  // Серии
  STREAK_3 = 'streak_3',
  STREAK_7 = 'streak_7',
  STREAK_30 = 'streak_30',
}

export { AiFeature } from './ai-feature.enum';
