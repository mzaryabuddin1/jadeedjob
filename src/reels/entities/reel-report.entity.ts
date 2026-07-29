import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Reel } from './reel.entity';

@Entity('reel_reports')
@Unique('UQ_reel_reports_reel_reporter', ['reelId', 'reporterUserId'])
@Index('IDX_reel_reports_status_created', ['status', 'createdAt'])
export class ReelReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reelId: number;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'reelId',
    foreignKeyConstraintName: 'FK_reel_reports_reel',
  })
  reel: Reel;

  @Column()
  reporterUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'reporterUserId',
    foreignKeyConstraintName: 'FK_reel_reports_reporter',
  })
  reporter: User;

  @Column({
    type: 'enum',
    enum: ['spam', 'unsafe', 'false_information', 'other'],
  })
  reason: 'spam' | 'unsafe' | 'false_information' | 'other';

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
    default: 'pending',
  })
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';

  @Column({ nullable: true })
  resolvedByAdminId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'resolvedByAdminId',
    foreignKeyConstraintName: 'FK_reel_reports_resolver',
  })
  resolvedByAdmin: User;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
