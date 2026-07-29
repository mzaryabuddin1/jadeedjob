import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';

@Entity('support_ticket_attachments')
export class SupportTicketAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticketId: number;

  @ManyToOne(() => SupportTicket, (ticket) => ticket.uploadedAttachments, {
    onDelete: 'CASCADE',
  })
  ticket: SupportTicket;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true, length: 36 })
  assetId: string;

  @Column({ nullable: true })
  contentType: string;

  @CreateDateColumn()
  createdAt: Date;
}
