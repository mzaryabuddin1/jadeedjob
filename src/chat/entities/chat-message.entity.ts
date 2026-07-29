// src/chat/entities/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_messages')
@Unique('UQ_chat_messages_conversation_sender_client', [
  'conversationId',
  'senderId',
  'clientMessageId',
])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  jobApplicationId: number;

  @ManyToOne(() => JobApplication, (app) => app.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobApplicationId' })
  jobApplication: JobApplication;

  @Column({ nullable: true, length: 36 })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversationId',
    foreignKeyConstraintName: 'FK_chat_messages_conversation',
  })
  conversation: ChatConversation;

  @Column({ nullable: true, length: 120 })
  clientMessageId: string;

  @Column()
  senderId: number;

  @ManyToOne(() => User, (user) => user.messagesSent, { eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ type: 'json', nullable: true })
  attachments: Array<{
    fileUrl: string;
    fileName?: string;
    contentType?: string;
  }>;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'video', 'audio', 'file'],
    default: 'text',
  })
  messageType: string;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
