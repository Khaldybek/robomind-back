import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';
import { LessonContent } from './lesson-content.entity';
import { Quiz } from './quiz.entity';
import { UserProgress } from './user-progress.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_module_id', type: 'uuid' })
  courseModuleId: string;

  @ManyToOne(() => CourseModule, (cm) => cm.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_module_id' })
  courseModule: CourseModule;

  @Column({ type: 'varchar', length: 512 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'unlock_after_lesson_id', type: 'uuid', nullable: true })
  unlockAfterLessonId: string | null;

  @ManyToOne(() => Lesson, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unlock_after_lesson_id' })
  unlockAfterLesson: Lesson | null;

  @OneToMany(() => LessonContent, (c) => c.lesson)
  contents: LessonContent[];

  @OneToOne(() => Quiz, (q) => q.lesson)
  quiz: Quiz;

  @OneToMany(() => UserProgress, (p) => p.lesson)
  userProgress: UserProgress[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
