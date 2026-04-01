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
import { City } from './city.entity';
import { School } from './school.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'name_kz', type: 'varchar', length: 255, nullable: true })
  nameKz: string | null;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => City, (c) => c.districts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @OneToMany(() => School, (s) => s.district)
  schools: School[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
