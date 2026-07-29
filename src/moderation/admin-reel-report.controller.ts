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
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SystemAdminGuard } from 'src/auth/system-admin.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ModerationService } from './moderation.service';

@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin/reel-reports')
export class AdminReelReportController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  list(
    @Query(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('pending', 'reviewed', 'dismissed', 'actioned', 'all')
            .default('pending'),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
        }),
      ),
    )
    query: any,
  ) {
    return this.moderationService.listReelReports(
      query.status,
      query.page,
      query.limit,
    );
  }

  @Patch(':reportId')
  resolve(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('reviewed', 'dismissed', 'actioned')
            .required(),
          resolutionNote: Joi.string().trim().max(2000).allow('', null).optional(),
        }),
      ),
    )
    body: any,
  ) {
    return this.moderationService.resolveReelReport(
      reportId,
      req.user.id,
      body.status,
      body.resolutionNote,
    );
  }
}
