import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BadgeKey } from '../enums';
import { User } from './user.entity';

@Entity('user_badges')
@Index('UQ_user_badges_user_key', ['userId', 'badgeKey'], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'badge_key',
    type: 'enum',
    enum: BadgeKey,
    enumName: 'badge_key',
  })
  badgeKey: BadgeKey;

  @CreateDateColumn({ name: 'earned_at', type: 'timestamptz' })
  earnedAt: Date;
}
