import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModuleContentType } from '../enums';
import { Lesson } from './lesson.entity';

@Entity('lesson_contents')
export class LessonContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, (l) => l.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({
    type: 'enum',
    enum: ModuleContentType,
    enumName: 'module_content_type',
  })
  type: ModuleContentType;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 1024, nullable: true })
  fileUrl: string | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({
    name: 'livestream_url',
    type: 'varchar',
    length: 1024,
    nullable: true,
  })
  livestreamUrl: string | null;

  @Column({ name: 'livestream_starts_at', type: 'timestamptz', nullable: true })
  livestreamStartsAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
