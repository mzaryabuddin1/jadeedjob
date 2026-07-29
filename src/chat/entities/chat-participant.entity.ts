import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_participants')
@Unique('UQ_chat_participants_conversation_user', ['conversationId', 'userId'])
@Index('IDX_chat_participants_user_conversation', ['userId', 'conversationId'])
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36 })
  conversationId: string;

  @ManyToOne(
    () => ChatConversation,
    (conversation) => conversation.participants,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'conversationId',
    foreignKeyConstraintName: 'FK_chat_participants_conversation',
  })
  conversation: ChatConversation;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_chat_participants_user',
  })
  user: User;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
