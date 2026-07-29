import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { SupportTicketAttachment } from './support-ticket-attachment.entity';
import { SupportTicketMessage } from './support-ticket-message.entity';

export type SupportTicketKind = 'feedback' | 'complaint';
export type SupportTicketCategory =
  | 'app'
  | 'payment'
  | 'job_post'
  | 'worker'
  | 'chat'
  | 'suggestion'
  | 'other';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['feedback', 'complaint'],
  })
  kind: SupportTicketKind;

  @Column({
    type: 'enum',
    enum: ['app', 'payment', 'job_post', 'worker', 'chat', 'suggestion', 'other'],
    default: 'other',
  })
  category: SupportTicketCategory;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  preferredContact: string;

  @Column({ nullable: true })
  contact: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'json', nullable: true })
  attachments: string[];

  @OneToMany(() => SupportTicketAttachment, (attachment) => attachment.ticket, {
    cascade: true,
  })
  uploadedAttachments: SupportTicketAttachment[];

  @OneToMany(() => SupportTicketMessage, (message) => message.ticket)
  messages: SupportTicketMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
