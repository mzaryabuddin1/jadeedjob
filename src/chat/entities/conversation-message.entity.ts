import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export const MESSAGE_TYPES: MessageType[] = [
  'text',
  'image',
  'video',
  'audio',
  'file',
];

@Entity('conversation_messages')
@Index('IDX_conv_msg_conv', ['conversationId', 'id'])
@Unique('UQ_conv_msg_client', ['conversationId', 'senderId', 'clientMsgId'])
export class ConversationMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  @Column({ type: 'varchar', length: 8, default: 'text' })
  messageType: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  mediaUrl: string | null;

  /** sent by the app to make retries safe: the same id is stored once */
  @Column({ type: 'varchar', length: 64, nullable: true })
  clientMsgId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  /** soft delete by the sender: the row stays, the content is hidden */
  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
