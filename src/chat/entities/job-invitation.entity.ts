import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('job_invitations')
@Index('IDX_job_invitations_invitee_status', ['inviteeUserId', 'status'])
@Index('IDX_job_invitations_job_invitee', ['jobId', 'inviteeUserId'])
@Unique('UQ_job_invitations_conversation', ['conversationId'])
export class JobInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 36 })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversationId',
    foreignKeyConstraintName: 'FK_job_invitations_conversation',
  })
  conversation: ChatConversation;

  @Column()
  jobId: number;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'jobId',
    foreignKeyConstraintName: 'FK_job_invitations_job',
  })
  job: Job;

  @Column()
  inviterUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'inviterUserId',
    foreignKeyConstraintName: 'FK_job_invitations_inviter',
  })
  inviter: User;

  @Column()
  inviteeUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'inviteeUserId',
    foreignKeyConstraintName: 'FK_job_invitations_invitee',
  })
  invitee: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
    default: 'pending',
  })
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

  @Column({ type: 'datetime', nullable: true })
  respondedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true, length: 120 })
  clientRequestId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
