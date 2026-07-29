import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from './company-page.entity';

@Entity('company_access_requests')
@Index('IDX_company_access_requests_company_status', ['companyId', 'status'])
@Index('IDX_company_access_requests_user_status', ['userId', 'status'])
export class CompanyAccessRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @ManyToOne(() => CompanyPage, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'companyId',
    foreignKeyConstraintName: 'FK_company_access_requests_company',
  })
  company: CompanyPage;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_company_access_requests_user',
  })
  user: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'editor'],
    default: 'editor',
  })
  requestedRole: 'admin' | 'editor';

  @Column({ type: 'text', nullable: true })
  reviewReason: string;

  @Column({ nullable: true })
  reviewedByUserId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'reviewedByUserId',
    foreignKeyConstraintName: 'FK_company_access_requests_reviewer',
  })
  reviewedBy: User;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ nullable: true, length: 120 })
  clientRequestId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
