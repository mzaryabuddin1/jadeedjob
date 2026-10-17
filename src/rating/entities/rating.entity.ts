import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Page } from 'src/pages/entities/page.entity';

/**
 * Who rated whom on an accepted application.
 * - `employee_to_employer`: the applicant rates the employer side
 * - `employer_to_employee`: the employer side rates the applicant
 */
export type RatingDirection = 'employee_to_employer' | 'employer_to_employee';

@Entity('ratings')
@Unique(['jobApplicationId', 'givenBy']) // Only one rating per application per rater
@Unique('UQ_rating_application_direction', ['jobApplicationId', 'direction']) // One rating per side
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobApplicationId: number;

  @ManyToOne(() => JobApplication, (app) => app.ratings, {
    onDelete: 'CASCADE',
  })
  jobApplication: JobApplication;

  @Column()
  givenBy: number; // userId of rater

  @ManyToOne(() => User, (user) => user.ratingsGiven)
  rater: User;

  /**
   * userId being rated. `null` when the rating goes to a page
   * (employee rating the employer of a job posted under a page).
   */
  @Column({ type: 'int', nullable: true })
  givenTo: number | null;

  @ManyToOne(() => User, (user) => user.ratingsReceived)
  ratedUser: User;

  /** Page being rated (page jobs, employee -> employer only) */
  @Column({ type: 'int', nullable: true })
  pageId: number | null;

  @ManyToOne(() => Page, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page;

  /** null only for ratings created before directions existed (backfilled at startup) */
  @Column({ type: 'varchar', length: 24, nullable: true })
  direction: RatingDirection | null;

  @Column({ type: 'int' })
  stars: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
