import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { LegalAcceptanceRequiredErrorDto } from './dto/legal-api.dto';

export function ApiCommunityAcceptanceRequired() {
  return applyDecorators(
    ApiResponse({
      status: 428,
      description:
        'Returned only after Community Guidelines enforcement is explicitly activated.',
      type: LegalAcceptanceRequiredErrorDto,
    }),
  );
}

export function ApiRegistrationAcceptanceRequired() {
  return applyDecorators(
    ApiResponse({
      status: 428,
      description:
        'Returned only after Terms and Privacy registration enforcement is explicitly activated.',
      type: LegalAcceptanceRequiredErrorDto,
    }),
  );
}
