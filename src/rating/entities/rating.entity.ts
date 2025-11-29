import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';

@Entity('ratings')
@Unique(['jobApplicationId', 'givenBy']) // Only one rating per application per rater
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobApplicationId: number;

  @ManyToOne(() => JobApplication, (app) => app.ratings, { onDelete: 'CASCADE' })
  jobApplication: JobApplication;

  @Column()
  givenBy: number; // userId of rater

  @ManyToOne(() => User, (user) => user.ratingsGiven)
  rater: User;

  @Column()
  givenTo: number; // userId being rated

  @ManyToOne(() => User, (user) => user.ratingsReceived)
  ratedUser: User;

  @Column({ type: 'int' })
  stars: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
