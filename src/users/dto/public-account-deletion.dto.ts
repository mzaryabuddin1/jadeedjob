import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicAccountDeletionSendOtpDto {
  @ApiProperty({ example: '03162394467' })
  phone: string;
}

export class PublicAccountDeletionConfirmDto extends PublicAccountDeletionSendOtpDto {
  @ApiProperty()
  otp: string;
}

export class ScheduledAccountDeletionDto {
  @ApiProperty({ example: 'scheduled' })
  status: 'scheduled';

  @ApiProperty({ format: 'date-time' })
  scheduledDeletionAt: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  blockers?: Record<string, unknown>[];
}

export class BlockedAccountDeletionDto {
  @ApiProperty({ example: 'blocked' })
  status: 'blocked';

  @ApiProperty({ example: 'ACCOUNT_DELETION_BLOCKED' })
  code: 'ACCOUNT_DELETION_BLOCKED';

  @ApiProperty()
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      companies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            companyId: { type: 'integer' },
            name: { type: 'string' },
            reason: { type: 'string', example: 'sole_owner' },
          },
        },
      },
    },
  })
  details: {
    companies: Array<{ companyId: number; name: string; reason: 'sole_owner' }>;
  };
}
