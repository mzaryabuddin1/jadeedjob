import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Page } from 'src/pages/entities/page.entity';
import { User } from './user.entity';

@Entity('work_experience')
export class WorkExperience {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  employment_type: string;

  @Column({ nullable: true })
  from_date: Date;

  @Column({ nullable: true })
  to_date: Date;

  @Column({ type: 'text', nullable: true })
  key_responsibilities: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location: string | null;

  /** Set when the employer is a JobsLoot page (links to its profile) */
  @Column({ type: 'int', nullable: true })
  pageId: number | null;

  @ManyToOne(() => Page, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pageId' })
  page: Page | null;

  @Column({ nullable: true })
  experience_certificate: string;

  @Column({ default: false })
  currently_working: boolean;

  @ManyToOne(() => User, (user) => user.work_experience, {
    onDelete: 'CASCADE',
  })
  user: User;
}
