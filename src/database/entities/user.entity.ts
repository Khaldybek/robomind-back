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
import { UserRole } from '../enums';
import { School } from './school.entity';
import { CourseAccess } from './course-access.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { UserProgress } from './user-progress.entity';
import { Certificate } from './certificate.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  iin: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  patronymic: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, (s) => s.users, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'school_id' })
  school: School | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;

  @OneToMany(() => CourseAccess, (a) => a.user)
  courseAccesses: CourseAccess[];

  @OneToMany(() => CourseAccess, (a) => a.grantedByUser)
  grantedCourseAccesses: CourseAccess[];

  @OneToMany(() => QuizAttempt, (q) => q.user)
  quizAttempts: QuizAttempt[];

  @OneToMany(() => UserProgress, (p) => p.user)
  userProgress: UserProgress[];

  @OneToMany(() => Certificate, (c) => c.user)
  certificates: Certificate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
