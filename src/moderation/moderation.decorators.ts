import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiErrorDto } from 'src/common/dto/api-error.dto';
import {
  CreateModerationReportDto,
  ModerationReportCreatedDto,
} from './dto/moderation-api.dto';

export function ApiCreateModerationReport(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiBody({ type: CreateModerationReportDto }),
    ApiCreatedResponse({ type: ModerationReportCreatedDto }),
    ApiConflictResponse({
      description: 'An active report already exists for this reporter and target.',
      type: ApiErrorDto,
    }),
  );
}
