import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** `blockerId` blocked `blockedId`: neither can message the other */
@Entity('user_blocks')
@Unique('UQ_user_block', ['blockerId', 'blockedId'])
@Index('IDX_user_block_blocked', ['blockedId'])
export class UserBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blockerId: number;

  @Column()
  blockedId: number;

  @CreateDateColumn()
  createdAt: Date;
}
