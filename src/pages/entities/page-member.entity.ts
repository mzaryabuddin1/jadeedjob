import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CompanyPage } from "./company-page.entity";

// src/pages/entities/page-member.entity.ts
@Entity('page_members')
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
  role: 'owner' | 'admin' | 'editor';

  @CreateDateColumn()
  createdAt: Date;
}
