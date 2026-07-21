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
import { Job } from 'src/job/entities/job.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { User } from 'src/users/entities/user.entity';

export type PostPublisherType = 'user' | 'company';

@Entity('community_posts')
@Index(['deletedAt', 'createdAt'])
@Index(['publisherType', 'creatorId', 'createdAt'])
@Index(['publisherType', 'publisherCompanyId', 'createdAt'])
export class CommunityPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'enum', enum: ['user', 'company'], default: 'user' })
  publisherType: PostPublisherType;

  @Column({ nullable: true })
  publisherCompanyId: number | null;

  @ManyToOne(() => CompanyPage, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'publisherCompanyId' })
  publisherCompany: CompanyPage | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ nullable: true, length: 2000 })
  imageUrl: string | null;

  @Column({ nullable: true, length: 500 })
  imageStorageKey: string | null;

  @Column({ nullable: true })
  linkedJobId: number | null;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedJobId' })
  linkedJob: Job | null;

  @Column({ default: true })
  allowComments: boolean;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  commentsCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  savesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sharesCount: number;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
