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
import { District } from './district.entity';
import { User } from './user.entity';

@Entity('schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  number: number | null;

  @Column({ name: 'district_id', type: 'uuid' })
  districtId: string;

  @ManyToOne(() => District, (d) => d.schools, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  @Column({ type: 'varchar', length: 512, nullable: true })
  address: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => User, (u) => u.school)
  users: User[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
