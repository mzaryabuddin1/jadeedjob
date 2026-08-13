import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalDocumentDto {
  @ApiProperty({ enum: ['terms', 'privacy', 'community_guidelines'] })
  documentType: 'terms' | 'privacy' | 'community_guidelines';

  @ApiProperty({ example: '2026-08' })
  version: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ format: 'uri' })
  contentUrl: string;

  @ApiProperty({ format: 'date-time' })
  effectiveAt: string;

  @ApiProperty({ format: 'date-time' })
  publishedAt: string;
}

export class LegalAcceptanceItemDto {
  @ApiProperty({ enum: ['terms', 'privacy', 'community_guidelines'] })
  documentType: 'terms' | 'privacy' | 'community_guidelines';

  @ApiProperty()
  version: string;
}

export class SubmitLegalAcceptancesDto {
  @ApiProperty({ type: [LegalAcceptanceItemDto], minItems: 1, maxItems: 3 })
  acceptances: LegalAcceptanceItemDto[];

  @ApiProperty({ enum: ['ios', 'android', 'web', 'unknown'] })
  clientPlatform: 'ios' | 'android' | 'web' | 'unknown';
}

export class UserLegalAcceptanceDto extends LegalAcceptanceItemDto {
  @ApiProperty({ enum: ['ios', 'android', 'web', 'unknown'] })
  clientPlatform: 'ios' | 'android' | 'web' | 'unknown';

  @ApiProperty({ format: 'date-time' })
  acceptedAt: string;
}

export class LegalAcceptanceRequiredDetailsDto {
  @ApiProperty({ enum: ['terms', 'privacy', 'community_guidelines'] })
  documentType: 'terms' | 'privacy' | 'community_guidelines';

  @ApiProperty()
  version: string;
}

export class LegalAcceptanceRequiredErrorDto {
  @ApiProperty({ example: 428 })
  statusCode: number;

  @ApiProperty({ example: 'Precondition Required' })
  error: string;

  @ApiProperty({ example: 'LEGAL_ACCEPTANCE_REQUIRED' })
  code: string;

  @ApiProperty({ example: 'Current legal acceptance is required' })
  message: string;

  @ApiPropertyOptional({ type: LegalAcceptanceRequiredDetailsDto })
  details?: LegalAcceptanceRequiredDetailsDto;
}
