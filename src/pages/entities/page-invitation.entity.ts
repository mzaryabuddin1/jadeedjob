import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Page } from './page.entity';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired';

/**
 * "Give access to my page": the page sends an invitation and the invited user
 * must accept before becoming a member (nobody can be added without consent).
 */
@Entity('page_invitations')
@Index('IDX_page_invitation_user_status', ['invitedUserId', 'status'])
@Index('IDX_page_invitation_page_status', ['pageId', 'status'])
export class PageInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pageId: number;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page;

  @Column()
  invitedUserId: number;

  /** Who sent it (owner / admin) */
  @Column()
  invitedBy: number;

  /** Role the user gets when accepting */
  @Column({ type: 'varchar', length: 10 })
  role: 'admin' | 'editor';

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: InvitationStatus;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
