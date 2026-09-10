import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageApiDto {
  @ApiProperty({
    type: String,
    description: 'Stable message ID. Legacy SQL IDs are returned as strings.',
  })
  id: string;

  @ApiProperty({ type: Number, description: 'Conversation-local sort order.' })
  sequence: number;

  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({ format: 'uuid' })
  conversationId: string;

  @ApiProperty({ type: Number })
  senderId: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ type: Array })
  attachments: Array<Record<string, unknown>>;

  @ApiProperty()
  messageType: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  readAt?: string | null;
}

export class ChatReadStateApiDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({ format: 'uuid' })
  conversationId: string;

  @ApiProperty({ type: String, nullable: true })
  lastReadMessageId: string | null;

  @ApiProperty({ type: Number, nullable: true })
  lastReadSequence: number | null;

  @ApiProperty({ format: 'date-time' })
  readAt: string;
}
