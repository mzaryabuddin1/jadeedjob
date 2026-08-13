import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SystemAdminGuard } from 'src/auth/system-admin.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ModerationService } from './moderation.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ModerationReportDto,
  ResolveModerationReportDto,
} from './dto/moderation-api.dto';

const listSchema = Joi.object({
  status: Joi.string().valid('pending', 'dismissed', 'actioned', 'all').default('pending'),
  targetType: Joi.string()
    .valid(
      'post',
      'post_comment',
      'reel',
      'reel_comment',
      'user',
      'company',
      'chat_message',
      'job',
    )
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const actionSchema = Joi.object({
  action: Joi.string()
    .valid('dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban')
    .required(),
  notes: Joi.string().trim().max(2000).allow('', null).optional(),
  suspensionEndsAt: Joi.date().iso().allow(null).optional(),
});

@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin/moderation/reports')
@ApiTags('Admin moderation')
@ApiBearerAuth()
export class AdminModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  @ApiOperation({ summary: 'List canonical moderation reports' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'dismissed', 'actioned', 'all'] })
  @ApiQuery({ name: 'targetType', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Query(new JoiValidationPipe(listSchema)) query: any) {
    return this.moderationService.listReports(query);
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get a moderation report and immutable audit history' })
  @ApiOkResponse({ type: ModerationReportDto })
  detail(@Param('reportId', ParseIntPipe) reportId: number) {
    return this.moderationService.getReport(reportId);
  }

  @Patch(':reportId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resolve a moderation report and record an audit action' })
  @ApiBody({ type: ResolveModerationReportDto })
  @ApiOkResponse({ type: ModerationReportDto })
  resolve(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Req() req: any,
    @Body(new JoiValidationPipe(actionSchema)) body: any,
  ) {
    return this.moderationService.resolveReport(
      reportId,
      req.user.id,
      body,
    );
  }
}
