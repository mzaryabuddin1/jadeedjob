import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { ChatParticipant } from './chat-participant.entity';

@Entity('chat_conversations')
@Unique('UQ_chat_conversations_application', ['applicationId'])
@Index('IDX_chat_conversations_job_activity', ['jobId', 'lastActivityAt'])
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['application', 'inquiry', 'invitation'],
  })
  type: 'application' | 'inquiry' | 'invitation';

  @Column({ nullable: true })
  jobId: number;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'jobId',
    foreignKeyConstraintName: 'FK_chat_conversations_job',
  })
  job: Job;

  @Column({ nullable: true })
  applicationId: number;

  @ManyToOne(() => JobApplication, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'applicationId',
    foreignKeyConstraintName: 'FK_chat_conversations_application',
  })
  application: JobApplication;

  @Column()
  createdByUserId: number;

  @Column({ nullable: true })
  companyId: number;

  @Column({
    type: 'enum',
    enum: ['active', 'read_only'],
    default: 'active',
  })
  writeState: 'active' | 'read_only';

  @Column({ nullable: true, length: 120 })
  readOnlyReason: string;

  @Column({ nullable: true, length: 120 })
  clientRequestId: string;

  @Column({ type: 'datetime', nullable: true })
  lastActivityAt: Date;

  @OneToMany(() => ChatParticipant, (participant) => participant.conversation)
  participants: ChatParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
