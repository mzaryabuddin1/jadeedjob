import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_name: string;

  @Column({ nullable: true })
  business_name: string;

  @Column({ nullable: true })
  company_logo: string;

  @Column({ nullable: true })
  website_url: string;

  @Column({ nullable: true })
  official_email: string;

  @Column({ nullable: true })
  official_phone: string;

  @Column({ nullable: true })
  industry_type: string;

  @Column({ type: 'text', nullable: true })
  company_description: string;

  @Column({ nullable: true })
  founded_year: number;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postal_code: string;

  @Column({ nullable: true })
  address_line1: string;

  @Column({ nullable: true })
  address_line2: string;

  @Column({ nullable: true })
  google_maps_link: string;

  @Column({ nullable: true })
  business_registration_number: string;

  @Column({ nullable: true })
  tax_identification_number: string;

  @Column({ nullable: true })
  registration_authority: string;

  @Column({ nullable: true })
  business_license_document: string;

  @Column({ nullable: true })
  company_type: string;

  @Column({ nullable: true })
  representative_name: string;

  @Column({ nullable: true })
  representative_designation: string;

  @Column({ nullable: true })
  representative_email: string;

  @Column({ nullable: true })
  representative_phone: string;

  @Column({ nullable: true })
  id_proof_document: string;

  @Column({ nullable: true })
  linkedin_page_url: string;

  @Column({ nullable: true })
  facebook_page_url: string;

  @Column({ nullable: true })
  instagram_page_url: string;

  @Column({ nullable: true })
  twitter_page_url: string;

  @Column({ nullable: true })
  youtube_channel_url: string;

  @Column({ nullable: true })
  verified_email_domain: string;

  @Column({ nullable: true })
  number_of_employees: number;

  @Column({ nullable: true })
  annual_revenue_range: string;

  @Column({ type: 'simple-array', nullable: true })
  client_list: string[];

  @Column({ type: 'simple-array', nullable: true })
  certifications: string[];

  @Column({ nullable: true })
  company_rating: number;

  @Column()
  ownerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
