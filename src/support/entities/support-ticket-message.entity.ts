import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('support_ticket_messages')
@Index('IDX_support_ticket_messages_ticket_created', ['ticketId', 'createdAt'])
export class SupportTicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticketId: number;

  @ManyToOne(() => SupportTicket, (ticket) => ticket.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'ticketId',
    foreignKeyConstraintName: 'FK_support_ticket_messages_ticket',
  })
  ticket: SupportTicket;

  @Column({ type: 'enum', enum: ['user', 'support'] })
  sender: 'user' | 'support';

  @Column({ nullable: true })
  senderUserId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'senderUserId',
    foreignKeyConstraintName: 'FK_support_ticket_messages_sender',
  })
  senderUser: User;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'json', nullable: true })
  attachments: Array<{
    fileUrl: string;
    fileName?: string;
    contentType?: string;
    assetId?: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
