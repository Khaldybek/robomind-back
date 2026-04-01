import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Module } from './module.entity';
import { Question } from './question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'module_id', type: 'uuid', unique: true })
  moduleId: string;

  @OneToOne(() => Module, (m) => m.quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ type: 'varchar', length: 512 })
  title: string;

  @Column({ name: 'passing_score', type: 'int' })
  passingScore: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'time_limit_minutes', type: 'int', nullable: true })
  timeLimitMinutes: number | null;

  @Column({ name: 'shuffle_questions', type: 'boolean', default: false })
  shuffleQuestions: boolean;

  @OneToMany(() => Question, (q) => q.quiz)
  questions: Question[];

  @OneToMany(() => QuizAttempt, (a) => a.quiz)
  attempts: QuizAttempt[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
