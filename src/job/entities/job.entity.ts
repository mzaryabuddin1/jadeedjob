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

  @Entity('jobs')
  export class Job {
    @PrimaryGeneratedColumn()
    id: number;

  @ManyToOne(() => Filter, (filter) => filter.jobs)
  @JoinColumn({ name: 'filterId' })
  filter: Filter;

  @Column()
  filterId: number;

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

    @Column()
    salaryType: string;

    @Column('double')
    salaryAmount: number;

    @Column({ nullable: true })
    currency: string;

    // MySQL Geo Point
    @Column({
      type: 'point',
      spatialFeatureType: 'Point',
      srid: 4326,
    })
    location: string;

    @Column({ type: 'date', nullable: true })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date;

    @Column({ nullable: true })
    industry: string;

    @Column({ nullable: true })
    educationLevel: string;

    @Column({ nullable: true })
    experienceRequired: string;

    @Column('simple-array', { nullable: true })
    languageRequirements: string[];

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => JobApplication, (app) => app.job)
      applications: JobApplication[];
  }
