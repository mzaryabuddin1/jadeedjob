import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from './company-page.entity';

@Entity('company_verification_reviews')
@Index('IDX_company_verification_reviews_company_created', [
  'companyId',
  'createdAt',
])
export class CompanyVerificationReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @ManyToOne(() => CompanyPage, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'companyId',
    foreignKeyConstraintName: 'FK_company_verification_reviews_company',
  })
  company: CompanyPage;

  @Column({ nullable: true })
  actorUserId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'actorUserId',
    foreignKeyConstraintName: 'FK_company_verification_reviews_actor',
  })
  actor: User;

  @Column({ nullable: true, length: 40 })
  previousStatus: string;

  @Column({ length: 40 })
  nextStatus: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'json', nullable: true })
  submissionSnapshot: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
