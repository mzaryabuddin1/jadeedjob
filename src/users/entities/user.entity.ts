import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { City } from 'src/city/entities/city.entity';
import { Education } from 'src/users/entities/education.entity';
import { Certification } from 'src/users/entities/certification.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Filter } from 'src/filter/entities/filter.entity';
import { WorkExperience } from './work-experience.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import type { UserAuthIdentity } from './user-auth-identity.entity';
import type { NotificationSettings } from 'src/notification/notification-settings';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Basic Auth fields
  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  /** Public handle, unique. Auto-generated at registration (first+last name + random). */
  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  username: string | null;

  /**
   * When the user last changed their username themselves. `null` = never
   * (the first change is allowed immediately; after that, once per 7 days).
   */
  @Column({ type: 'datetime', nullable: true })
  usernameChangedAt: Date | null;

  @Column({ unique: true, nullable: true })
  googleId: string;

  @Column({ unique: true, nullable: true })
  facebookId: string;

  /**
   * All linked Google / Facebook identities (supports multiple per provider).
   * Legacy googleId / facebookId columns are kept as primary mirrors for compatibility.
   */
  @OneToMany('UserAuthIdentity', 'user')
  authIdentities: UserAuthIdentity[];

  @Column({ default: 'phone' })
  authProvider: 'phone' | 'google' | 'facebook';

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  passwordSalt: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isBanned: boolean;

  /** User accepted terms & conditions at registration */
  @Column({ default: false })
  terms_and_condition: boolean;

  // Basic details
  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  father_name: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  marital_status: string;

  @Column({ nullable: true })
  profile_photo: string;

  /** Profile banner image (LinkedIn-style) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_photo: string | null;

  /** One-line professional headline shown under the name, e.g. "Warehouse supervisor | 6 yrs" */
  @Column({ type: 'varchar', length: 220, nullable: true })
  headline: string | null;

  /** Tells employers the user is looking for work */
  @Column({ type: 'boolean', default: false })
  open_to_work: boolean;

  // Contact Information
  @Column({ nullable: true })
  alternate_phone: string;

  @Column({ nullable: true })
  address_line1: string;

  @Column({ nullable: true })
  address_line2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postal_code: string;

  @Column({ nullable: true })
  contact_country: string;

  // Professional summary
  @Column({ nullable: true, type: 'text' })
  professional_summary: string;

  // Social links
  @Column({ nullable: true })
  linkedin_url: string;

  @Column({ nullable: true })
  github_url: string;

  @Column({ nullable: true })
  portfolio_url: string;

  @Column({ nullable: true })
  behance_url: string;

  // Skills
  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column('simple-array', { nullable: true })
  technical_skills: string[];

  @Column('simple-array', { nullable: true })
  soft_skills: string[];

  // Bank Information
  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  account_number: string;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  branch_name: string;

  @Column({ nullable: true })
  swift_code: string;

  // Verification
  @Column({ default: 'pending' })
  kyc_status: string;

  @Column({ nullable: true })
  verified_by_admin_id: number;

  @Column({ type: 'date', nullable: true })
  verification_date: Date;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'simple-array', nullable: true })
  fcmTokens: string[];

  @OneToMany(() => Rating, (rating) => rating.ratedUser)
  ratingsReceived: Rating[];

  @OneToMany(() => Rating, (rating) => rating.rater)
  ratingsGiven: Rating[];

  @Column({ type: 'float', default: 0 })
  ratingAverage: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  /** Cached counters (kept in sync by FollowService) */
  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  // Many-to-one with Country
  @ManyToOne(() => Country, (country) => country.users, {
    eager: true,
    nullable: true,
  })
  country: Country | null;

  // Many-to-one with City (optional profile city)
  @ManyToOne(() => City, (city) => city.users, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'cityId' })
  cityEntity: City | null;

  // Many-to-one with Language
  @ManyToOne(() => Language, (language) => language.users, {
    eager: true,
    nullable: true,
  })
  language: Language | null;

  // Nested Arrays → OneToMany relations
  @OneToMany(() => WorkExperience, (workExp) => workExp.user, {
    cascade: true,
    eager: true,
  })
  work_experience: WorkExperience[];

  @OneToMany(() => Education, (education) => education.user, {
    cascade: true,
    eager: true,
  })
  education: Education[];

  @OneToMany(() => Certification, (cert) => cert.user, {
    cascade: true,
    eager: true,
  })
  certifications: Certification[];

  @OneToMany(() => JobApplication, (app) => app.applicant)
  applications: JobApplication[];

  @OneToMany(() => Filter, (filter) => filter.creator)
  createdFilters: Filter[];

  @OneToMany(() => ChatMessage, (msg) => msg.sender)
  messagesSent: ChatMessage[];

  @OneToMany(() => Job, (job) => job.creator)
  jobsCreated: Job[];

  @Column('simple-array', { nullable: true })
  filter_preferences: number[];

  /**
   * Notification channels the user opted in to. `null` = defaults
   * (see DEFAULT_NOTIFICATION_SETTINGS). New channels can be added later
   * without a schema change.
   */
  @Column({ type: 'json', nullable: true })
  notification_settings: NotificationSettings | null;

  // Auto timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
