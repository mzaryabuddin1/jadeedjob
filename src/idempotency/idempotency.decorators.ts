import { applyDecorators } from '@nestjs/common';
import { ApiConflictResponse, ApiHeader } from '@nestjs/swagger';
import { ApiErrorDto } from 'src/common/dto/api-error.dto';

export function ApiOptionalIdempotencyKey() {
  return applyDecorators(
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description:
        'Optional retry key scoped to the authenticated user and operation. Reuse with the same payload replays the original response.',
      schema: { type: 'string', maxLength: 120 },
    }),
    ApiConflictResponse({
      description:
        'The key is processing or was already used with a different payload.',
      type: ApiErrorDto,
    }),
  );
}
