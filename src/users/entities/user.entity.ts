import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { Education } from 'src/users/entities/education.entity';
import { Certification } from 'src/users/entities/certification.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Filter } from 'src/filter/entities/filter.entity';
import { WorkExperience } from './work-experience.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { Rating } from 'src/rating/entities/rating.entity';

export type SpokenLanguage = {
  language: string;
  level: string;
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Basic Auth fields
  @Column({ nullable: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  passwordSalt: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'datetime', nullable: true })
  phoneVerifiedAt: Date;

  @Column({ unique: true, nullable: true })
  referralCode: string;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  systemRole: 'user' | 'admin';

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletionScheduledAt: Date;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date;

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

  @Column({ nullable: true, length: 36 })
  profilePhotoAssetId: string;

  // Identity documents
  @Column({ nullable: true })
  national_id_number: string;

  @Column({ nullable: true })
  passport_number: string;

  @Column({ type: 'date', nullable: true })
  id_expiry_date: Date;

  @Column({ nullable: true })
  id_document_front: string;

  @Column({ nullable: true, length: 36 })
  idDocumentFrontAssetId: string;

  @Column({ nullable: true })
  id_document_back: string;

  @Column({ nullable: true, length: 36 })
  idDocumentBackAssetId: string;

  @Column({ nullable: true })
  address_proof_document: string;

  @Column({ nullable: true, length: 36 })
  addressProofAssetId: string;

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

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

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

  @Column({ nullable: true, type: 'text' })
  admin_notes: string;

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

  // Many-to-one with Country
  @ManyToOne(() => Country, (country) => country.users, { eager: true })
  country: Country;

  // Many-to-one with Language
  @ManyToOne(() => Language, (language) => language.users, { eager: true })
  language: Language;

  @Column({ type: 'json', nullable: true })
  languages_spoken: SpokenLanguage[];

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

  // Auto timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
