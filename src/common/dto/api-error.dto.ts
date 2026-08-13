import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: 'IDEMPOTENCY_CONFLICT' })
  code: string;

  @ApiProperty({ example: 'The request conflicts with an existing operation' })
  message: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional({ type: [String] })
  errors?: string[];
}
