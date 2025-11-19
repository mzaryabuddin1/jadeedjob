import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
