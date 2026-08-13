import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reel } from './reel.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('reel_comments')
@Index(['reelId', 'createdAt'])
export class ReelComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reelId: number;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reelId' })
  reel: Reel;

  @Column()
  userId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: ['visible', 'hidden', 'removed'],
    default: 'visible',
  })
  moderationStatus: 'visible' | 'hidden' | 'removed';

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ nullable: true })
  deletedByUserId: number | null;

  @Column({ nullable: true, length: 80 })
  deletionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
