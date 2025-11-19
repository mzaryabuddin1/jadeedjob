import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('filters')
export class Filter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'fas fa-user-tie' })
  icon: string;

  @Column({ default: 'active' })
  status: 'active' | 'inactive';

  @Column({ default: 'pending' })
  approvalStatus: 'pending' | 'approved' | 'rejected';

  @Column({ nullable: true })
  rejectionReason: string;

  @Column()
  createdBy: number;

  // A user can create many filters → One-to-Many on user side, Many-to-One here
  @ManyToOne(() => User, (user) => user.createdFilters)
  creator: User;

  // FILTER → JOBS (One-to-Many)
  @OneToMany(() => Job, (job) => job.filter)
  jobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
