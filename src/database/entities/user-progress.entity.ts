import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { ProgressStatus } from '../enums';
import { User } from './user.entity';
import { Course } from './course.entity';
import { Module } from './module.entity';

@Entity('user_progress')
@Index('UQ_user_progress_user_module', ['userId', 'moduleId'], { unique: true })
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (c) => c.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => Module, (m) => m.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({
    type: 'enum',
    enum: ProgressStatus,
    enumName: 'progress_status',
  })
  status: ProgressStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'watched_seconds', type: 'int', default: 0 })
  watchedSeconds: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
