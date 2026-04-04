import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseAccessType } from '../enums';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('course_accesses')
export class CourseAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.courseAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (c) => c.courseAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string | null;

  @ManyToOne(() => User, (u) => u.grantedCourseAccesses, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'granted_by' })
  grantedByUser: User | null;

  @Column({
    name: 'access_type',
    type: 'enum',
    enum: CourseAccessType,
    enumName: 'course_access_type',
  })
  accessType: CourseAccessType;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
