import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ModerationReport } from './moderation-report.entity';

@Entity('moderation_audits')
@Index('IDX_moderation_audits_report_created', ['reportId', 'createdAt'])
@Index('UQ_moderation_audits_dedupe_key', ['dedupeKey'], { unique: true })
export class ModerationAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reportId: number;

  @ManyToOne(() => ModerationReport, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'reportId',
    foreignKeyConstraintName: 'FK_moderation_audits_report',
  })
  report: ModerationReport;

  @Column({ nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'actorUserId',
    foreignKeyConstraintName: 'FK_moderation_audits_actor',
  })
  actor: User | null;

  @Column({ length: 60 })
  event: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ nullable: true, length: 255 })
  dedupeKey: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
