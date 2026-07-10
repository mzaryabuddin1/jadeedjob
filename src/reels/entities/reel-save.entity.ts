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

@Entity('reel_saves')
@Index(['reelId', 'userId'], { unique: true })
export class ReelSave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reelId: number;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reelId' })
  reel: Reel;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
