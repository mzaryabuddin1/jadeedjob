// src/chat/entities/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobApplicationId: number;

  @ManyToOne(() => JobApplication, (app) => app.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobApplicationId' })
  jobApplication: JobApplication;

  @Column()
  senderId: number;

  @ManyToOne(() => User, (user) => user.messagesSent, { eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
