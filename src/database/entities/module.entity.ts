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
import { Course } from './course.entity';
import { ModuleContent } from './module-content.entity';
import { Quiz } from './quiz.entity';
import { UserProgress } from './user-progress.entity';

@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (c) => c.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar', length: 512 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'unlock_after_module_id', type: 'uuid', nullable: true })
  unlockAfterModuleId: string | null;

  @ManyToOne(() => Module, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unlock_after_module_id' })
  unlockAfterModule: Module | null;

  @OneToMany(() => ModuleContent, (c) => c.module)
  contents: ModuleContent[];

  @OneToOne(() => Quiz, (q) => q.module)
  quiz: Quiz;

  @OneToMany(() => UserProgress, (p) => p.module)
  userProgress: UserProgress[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
