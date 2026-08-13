import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Filter } from 'src/filter/entities/filter.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { CompanyBranch } from 'src/pages/entities/company-branch.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Filter, (filter) => filter.jobs, { eager: true })
  @JoinColumn({ name: 'filterId' })
  filter: Filter;

  @Column()
  filterId: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  requirements: string;

  @Column('simple-array', { nullable: true })
  benefits: string[];

  @Column('simple-array', { nullable: true })
  shifts: string[];

  @Column('simple-array', { nullable: true })
  jobTypes: string[];

  @Column({ nullable: true })
  jobType: string;

  @Column({ nullable: true })
  shift: string;

  @Column({ nullable: true })
  working_hours: string;

  @Column()
  salaryType: string;

  @Column('double')
  salaryAmount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'int', nullable: true })
  vacancies: number;

  @Column({ default: false })
  isRemote: boolean;

  // MySQL Geo Point
  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: {
      from: (value: any) => {
        if (!value) return null;

        // mysql2 object
        if (value.x !== undefined) {
          return { lng: value.x, lat: value.y };
        }

        // raw SQL WKT
        if (typeof value === 'string') {
          const m = value.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
          if (m) return { lng: +m[1], lat: +m[2] };
        }

        return null;
      },
      to: (value) => value,
    },
  })
  location: { lat: number; lng: number };

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  educationLevel: string;

  @Column({ nullable: true })
  experienceRequired: string;

  @Column('simple-array', { nullable: true })
  languageRequirements: string[];

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({
    type: 'enum',
    enum: ['individual', 'company'],
    default: 'individual',
  })
  postingMode: 'individual' | 'company';

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'closed'],
    default: 'active',
  })
  status: 'draft' | 'active' | 'closed';

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: ['visible', 'hidden', 'removed'],
    default: 'visible',
  })
  moderationStatus: 'visible' | 'hidden' | 'removed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  createdBy: number;

  @ManyToOne(() => User, (user) => user.jobsCreated)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => JobApplication, (app) => app.job)
  applications: JobApplication[];

  @Column({ nullable: true })
  pageId?: number;

  @ManyToOne(() => CompanyPage, { nullable: true })
  @JoinColumn({ name: 'pageId' })
  page?: CompanyPage;

  @Column({ nullable: true })
  branchId?: number;

  @ManyToOne(() => CompanyBranch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: CompanyBranch;
}
