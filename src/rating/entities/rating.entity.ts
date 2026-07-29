import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';

@Entity('ratings')
@Unique('UQ_ratings_application_side', ['jobApplicationId', 'side'])
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

  @ManyToOne(() => User, (user) => user.ratingsGiven, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'givenBy',
    foreignKeyConstraintName: 'FK_ratings_given_by',
  })
  rater: User;

  @Column({ nullable: true })
  givenTo: number; // userId being rated

  @ManyToOne(() => User, (user) => user.ratingsReceived, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'givenTo',
    foreignKeyConstraintName: 'FK_ratings_given_to',
  })
  ratedUser: User;

  @Column({ type: 'enum', enum: ['worker', 'employer'] })
  side: 'worker' | 'employer';

  @Column({ type: 'enum', enum: ['user', 'company'], default: 'user' })
  targetType: 'user' | 'company';

  @Column({ nullable: true })
  targetUserId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'targetUserId',
    foreignKeyConstraintName: 'FK_ratings_target_user',
  })
  targetUser: User;

  @Column({ nullable: true })
  targetCompanyId: number;

  @ManyToOne(() => CompanyPage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'targetCompanyId',
    foreignKeyConstraintName: 'FK_ratings_target_company',
  })
  targetCompany: CompanyPage;

  @Column({ default: false })
  legacyGrandfathered: boolean;

  @Column({ type: 'int' })
  stars: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
