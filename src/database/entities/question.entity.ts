import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionType } from '../enums';
import { Quiz } from './quiz.entity';
import { Answer } from './answer.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quiz_id', type: 'uuid' })
  quizId: string;

  @ManyToOne(() => Quiz, (q) => q.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    enumName: 'question_type',
  })
  type: QuestionType;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  /** Эталон для проверки текстовых ответов (ИИ / ручная оценка) */
  @Column({ name: 'reference_answer', type: 'text', nullable: true })
  referenceAnswer: string | null;

  /** Критерии оценки (текст или JSON-строка для ИИ) */
  @Column({ name: 'grading_rubric', type: 'text', nullable: true })
  gradingRubric: string | null;

  @OneToMany(() => Answer, (a) => a.question)
  answers: Answer[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
