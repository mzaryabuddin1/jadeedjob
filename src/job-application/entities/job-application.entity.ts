import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Rating } from 'src/rating/entities/rating.entity';

@Entity('job_applications')
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
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  })
  status: string;

  @OneToMany(() => ChatMessage, (msg) => msg.jobApplication)
  messages: ChatMessage[];

  @OneToMany(() => Rating, (rating) => rating.jobApplication)
  ratings: Rating[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
