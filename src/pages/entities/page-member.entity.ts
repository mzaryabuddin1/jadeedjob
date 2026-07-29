import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CompanyPage } from './company-page.entity';
import { CompanyMemberRole, CompanyPermissions } from '../company-permissions';

// src/pages/entities/page-member.entity.ts
@Entity('page_members')
@Unique('UQ_page_members_page_user', ['pageId', 'userId'])
export class PageMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pageId: number;

  @ManyToOne(() => CompanyPage, (page) => page.members, {
    onDelete: 'CASCADE',
  })
  page: CompanyPage;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'editor'],
  })
  role: CompanyMemberRole;

  @Column({ default: true })
  hasAccess: boolean;

  @Column({ type: 'json', nullable: true })
  permissions: Partial<CompanyPermissions>;

  @CreateDateColumn()
  createdAt: Date;
}
