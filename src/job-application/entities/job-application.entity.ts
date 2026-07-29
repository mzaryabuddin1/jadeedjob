import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import { JobInvitation } from 'src/chat/entities/job-invitation.entity';

@Entity('job_applications')
@Unique('UQ_job_applications_job_applicant', ['jobId', 'applicantId'])
export class JobApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  jobId: number;

  @ManyToOne(() => User, (user) => user.applications, {
    onDelete: 'CASCADE',
  })
  applicant: User;

  @Column()
  applicantId: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'completed'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  bidAmount: number;

  @Column({ nullable: true, length: 12 })
  bidCurrency: string;

  @Column({ nullable: true, length: 120 })
  lastApplyRequestId: string;

  @Column({ nullable: true, length: 36 })
  sourceInvitationId: string;

  @ManyToOne(() => JobInvitation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'sourceInvitationId',
    foreignKeyConstraintName: 'FK_job_applications_source_invitation',
  })
  sourceInvitation: JobInvitation;

  @Column({ type: 'datetime', nullable: true })
  withdrawnAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @OneToMany(() => ChatMessage, (msg) => msg.jobApplication)
  messages: ChatMessage[];

  @OneToMany(() => Rating, (rating) => rating.jobApplication)
  ratings: Rating[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
