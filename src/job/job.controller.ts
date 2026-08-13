import {
  Controller,
  Post,
  Body,
  UsePipes,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  ParseIntPipe,
  Delete,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JobService } from './job.service';
import Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ModerationService } from 'src/moderation/moderation.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOptionalIdempotencyKey } from 'src/idempotency/idempotency.decorators';
import { ApiCreateModerationReport } from 'src/moderation/moderation.decorators';

const JOB_TITLE_MAX_LENGTH = 35;
const jobTitleSchema = Joi.string().trim().max(JOB_TITLE_MAX_LENGTH).messages({
  'string.max': 'Title cannot exceed 35 characters',
});

@Controller('job')
@ApiTags('Jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly moderationService: ModerationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOptionalIdempotencyKey()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        title: jobTitleSchema.required(),
        filterId: Joi.number().required(),
        description: Joi.string().required(),
        pageId: Joi.number().optional(),
        companyId: Joi.number().allow(null).optional(),
        branchId: Joi.number().allow(null).optional(),
        postingMode: Joi.string().valid('individual', 'company').optional(),
        requirements: Joi.string().optional(),
        benefits: Joi.array().items(Joi.string()).optional(),
        jobType: Joi.string().optional(),
        shift: Joi.string().optional(),
        working_hours: Joi.string().optional(),
        shifts: Joi.array().items(
          Joi.string().valid('morning', 'evening', 'night', 'rotational'),
        ),
        jobTypes: Joi.array().items(
          Joi.string().valid(
            'full-time',
            'part-time',
            'contract',
            'temporary',
            'freelance',
            'internship',
          ),
        ),
        salaryType: Joi.string()
          .valid(
            'piece-rate',
            'daily-wage',
            'hourly',
            'monthly',
            'fixed',
            'commission',
            'negotiable',
          )
          .required(),
        salaryAmount: Joi.number().required(),
        currency: Joi.string().optional(),
        vacancies: Joi.number().integer().min(1).optional(),
        isRemote: Joi.boolean().optional(),
        status: Joi.string().valid('draft', 'active', 'closed').optional(),

        location: Joi.object({
          lat: Joi.number().required(),
          lng: Joi.number().required(),
        }).optional(),

        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        deadline: Joi.date().optional(),
        industry: Joi.string().optional(),
        educationLevel: Joi.string().optional(),
        experienceRequired: Joi.string().optional(),
        languageRequirements: Joi.array().items(Joi.string()).optional(),
        contactEmail: Joi.string().email().optional(),
        contactPhone: Joi.string().optional(),
      }),
    ),
  )
  async createJob(
    @Body() body: any,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    body.createdBy = req.user.id;
    return this.jobService.createJob(
      body,
      req.user.id,
      idempotencyKey,
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findJobs(@Query() query: any, @Req() req: any) {
    if (query.myjobs === 'true' && !req.user?.id) {
      throw new UnauthorizedException('Authentication is required for myjobs');
    }
    return this.jobService.findJobs(query, req.user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findJob(@Param('id') id: number, @Req() req: any) {
    return this.jobService.findJobById(Number(id), req.user?.id);
  }

  @Post(':jobId/report')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiBearerAuth()
  @ApiCreateModerationReport('Report a visible job')
  reportJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          reason: Joi.string()
            .trim()
            .valid(
              'spam',
              'misleading',
              'fraud',
              'unsafe',
              'inappropriate',
              'other',
            )
            .required(),
          details: Joi.string().trim().max(1000).allow('', null).optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.moderationService.reportJob(
      jobId,
      req.user.id,
      body,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async patchJob(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          title: jobTitleSchema.optional(),
          description: Joi.string().optional(),
          pageId: Joi.number().optional(),
          companyId: Joi.number().allow(null).optional(),
          branchId: Joi.number().allow(null).optional(),
          postingMode: Joi.string().valid('individual', 'company').optional(),
          filterId: Joi.number().optional(),
          requirements: Joi.string().optional(),
          benefits: Joi.array().items(Joi.string()).optional(),
          jobType: Joi.string().optional(),
          shift: Joi.string().optional(),
          working_hours: Joi.string().optional(),
          shifts: Joi.array().items(
            Joi.string().valid('morning', 'evening', 'night', 'rotational'),
          ),
          jobTypes: Joi.array().items(
            Joi.string().valid(
              'full-time',
              'part-time',
              'contract',
              'temporary',
              'freelance',
              'internship',
            ),
          ),
          salaryType: Joi.string()
            .valid(
              'piece-rate',
              'daily-wage',
              'hourly',
              'monthly',
              'fixed',
              'commission',
              'negotiable',
            )
            .optional(),
          salaryAmount: Joi.number().optional(),
          currency: Joi.string().optional(),
          vacancies: Joi.number().integer().min(1).optional(),
          isRemote: Joi.boolean().optional(),
          status: Joi.string().valid('draft', 'active', 'closed').optional(),

          location: Joi.object({
            lat: Joi.number().required(),
            lng: Joi.number().required(),
          }).optional(),

          startDate: Joi.date().optional(),
          endDate: Joi.date().optional(),
          deadline: Joi.date().optional(),
          industry: Joi.string().optional(),
          educationLevel: Joi.string().optional(),
          experienceRequired: Joi.string().optional(),
          languageRequirements: Joi.array().items(Joi.string()).optional(),
          contactEmail: Joi.string().email().optional(),
          contactPhone: Joi.string().optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.jobService.updateJob(id, body, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string().valid('draft', 'active', 'closed').required(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.jobService.updateJobStatus(id, body.status, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteJob(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.jobService.closeJob(id, req.user.id);
  }
}
