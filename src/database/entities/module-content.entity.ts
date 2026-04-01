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
import { Module } from './module.entity';

@Entity('module_contents')
export class ModuleContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => Module, (m) => m.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

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

  @Column({ name: 'livestream_url', type: 'varchar', length: 1024, nullable: true })
  livestreamUrl: string | null;

  @Column({ name: 'livestream_starts_at', type: 'timestamptz', nullable: true })
  livestreamStartsAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
