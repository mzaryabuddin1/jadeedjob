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

  @CreateDateColumn()
  createdAt: Date;
}
