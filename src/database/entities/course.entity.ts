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
import { CourseLevel } from '../enums';
import { User } from './user.entity';
import { Module } from './module.entity';
import { CourseAccess } from './course-access.entity';
import { UserProgress } from './user-progress.entity';
import { Certificate } from './certificate.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 512 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 1024, nullable: true })
  thumbnailUrl: string | null;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    enumName: 'course_level',
  })
  level: CourseLevel;

  @Column({ name: 'age_group', type: 'varchar', length: 64, nullable: true })
  ageGroup: string | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @OneToMany(() => Module, (m) => m.course)
  modules: Module[];

  @OneToMany(() => CourseAccess, (a) => a.course)
  courseAccesses: CourseAccess[];

  @OneToMany(() => UserProgress, (p) => p.course)
  userProgress: UserProgress[];

  @OneToMany(() => Certificate, (c) => c.course)
  certificates: Certificate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
