import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalAcceptanceItemDto } from 'src/legal/dto/legal-api.dto';

export class RegisterSendOtpDto {
  @ApiProperty()
  firstName: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty({ example: '03162394467' })
  phone: string;

  @ApiProperty({ oneOf: [{ type: 'integer' }, { type: 'string' }] })
  countryId: number | string;

  @ApiProperty({ oneOf: [{ type: 'integer' }, { type: 'string' }] })
  languageId: number | string;

  @ApiProperty({ format: 'password' })
  password: string;

  @ApiPropertyOptional({ format: 'email' })
  email?: string;

  @ApiPropertyOptional()
  photoUri?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  longitude?: number;

  @ApiPropertyOptional({ type: [LegalAcceptanceItemDto], maxItems: 3 })
  legalAcceptances?: LegalAcceptanceItemDto[];

  @ApiPropertyOptional({ enum: ['ios', 'android', 'web', 'unknown'] })
  clientPlatform?: 'ios' | 'android' | 'web' | 'unknown';
}
