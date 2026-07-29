import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_read_states')
@Unique('UQ_chat_read_states_conversation_user', ['conversationId', 'userId'])
@Index('IDX_chat_read_states_user_updated', ['userId', 'updatedAt'])
export class ChatReadState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36 })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversationId',
    foreignKeyConstraintName: 'FK_chat_read_states_conversation',
  })
  conversation: ChatConversation;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_chat_read_states_user',
  })
  user: User;

  @Column({ nullable: true })
  lastReadMessageId: number;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
