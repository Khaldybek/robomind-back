import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { Module } from './module.entity';

@Entity('module_homework_submissions')
export class ModuleHomeworkSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'file_url', type: 'varchar', length: 1024 })
  fileUrl: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 512 })
  originalFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'int', nullable: true })
  sizeBytes: number | null;

  @Column({ name: 'student_comment', type: 'text', nullable: true })
  studentComment: string | null;

  /** Максимум баллов за работу (по умолчанию 100; можно менять при оценке) */
  @Column({ name: 'max_points', type: 'int', default: 100 })
  maxPoints: number;

  /** Выставленные баллы; null — ещё не оценено */
  @Column({ type: 'int', nullable: true })
  points: number | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @Column({ name: 'graded_by_user_id', type: 'uuid', nullable: true })
  gradedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'graded_by_user_id' })
  gradedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
