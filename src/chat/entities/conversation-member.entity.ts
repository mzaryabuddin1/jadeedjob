import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** A person in a conversation, with their own read position and mute setting */
@Entity('conversation_members')
@Unique('UQ_conv_member', ['conversationId', 'userId'])
@Index('IDX_conv_member_user', ['userId', 'conversationId'])
export class ConversationMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  userId: number;

  /** everything up to this message id is read (unread = newer messages from others) */
  @Column({ type: 'int', default: 0 })
  lastReadMessageId: number;

  /** no push notifications until then */
  @Column({ type: 'datetime', nullable: true })
  mutedUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
