import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModerationReportDto {
  @ApiProperty({
    enum: [
      'spam',
      'harassment',
      'impersonation',
      'misleading',
      'false_information',
      'fraud',
      'unsafe',
      'inappropriate',
      'other',
    ],
  })
  reason: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  details?: string | null;
}

export class ResolveModerationReportDto {
  @ApiProperty({ enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'] })
  action: 'dismiss' | 'hide' | 'remove' | 'warn' | 'suspend' | 'ban';

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  suspensionEndsAt?: string | null;
}

export class ModerationReportDto {
  @ApiProperty({ example: '17' })
  id: string;

  @ApiProperty({
    enum: [
      'post',
      'post_comment',
      'reel',
      'reel_comment',
      'user',
      'company',
      'chat_message',
      'job',
    ],
  })
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ enum: ['pending', 'dismissed', 'actioned'] })
  status: string;

  @ApiPropertyOptional({
    enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'],
    nullable: true,
  })
  action?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class ModerationReportCreatedDto {
  @ApiProperty()
  reportId: string;

  @ApiProperty({ example: 'pending' })
  status: 'pending';

  @ApiProperty({ example: true })
  reported: true;
}
