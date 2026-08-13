import { ApiProperty } from '@nestjs/swagger';

export class InvitationProjectionDto {
  @ApiProperty({ format: 'uuid', description: 'Compatibility alias.' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  invitationId: string;

  @ApiProperty({
    enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
  })
  status: string;

  @ApiProperty({ enum: ['respond', 'cancel'], nullable: true })
  viewerAction: 'respond' | 'cancel' | null;
}

export class UpdateInvitationDto {
  @ApiProperty({ enum: ['accept', 'decline', 'cancel'] })
  action: 'accept' | 'decline' | 'cancel';
}
