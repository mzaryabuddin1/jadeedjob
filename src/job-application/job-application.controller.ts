import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UsePipes,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobApplicationService } from './job-application.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@ApiTags('Job Applications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('job-application')
export class JobApplicationController {
  constructor(private readonly jobAppService: JobApplicationService) {}

  @Post()
  @ApiOperation({
    summary: 'Apply to a job',
    description: [
      'A user can apply **once** per job (400 `You already applied to this job`), and not to their own job.',
      'The job owner is **not** pinged instantly: applications are queued and merged into ONE notification after ~30 seconds,',
      'e.g. `3 people applied to your job "X" (12 total)`. Busy jobs are spaced out (at least 2 min between notifications).',
      "Push/email follow the owner's `notification-settings`. Push `data`: `type=job_application, jobId, jobTitle, title, text, count, totalApplications, applicantIds, applicantNames, applicationId, createdAt, path`.",
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['job'],
      properties: { job: { type: 'number', example: 1 } },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        job: Joi.number().required(),
      }),
    ),
  )
  async apply(@Body() body: any, @Req() req: any) {
    return this.jobAppService.apply({
      jobId: Number(body.job),
      applicantId: req.user.id,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'My applications' })
  async getMyApplications(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.jobAppService.getApplicationsByUser(req.user.id, +page, +limit);
  }

  @Get('job/:jobId')
  @ApiOperation({
    summary: 'Applications for a job (employer only)',
    description:
      'Only the employer side may call this: the user who posted the job, or - for a job posted under a company page - the page owner / admin / editor (403 otherwise). Applicant objects never include private fields (password hash, FCM tokens, bank details...).',
  })
  async getByJob(@Param('jobId', ParseIntPipe) jobId: number, @Req() req: any) {
    return this.jobAppService.getApplicationsByJob(jobId, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Accept or reject an application (employer only)',
    description: [
      'Only the employer side (job poster, or company page owner/admin/editor) can decide; 403 otherwise.',
      'Only a **pending** application can be decided and the decision is **final**.',
      '**accepted** → the applicant gets a push/email notification (per their notification settings) and **both sides can now rate each other** (`POST /ratings`). **rejected** → no notification.',
      'Push `data` for accepted: `type=application_accepted, applicationId, jobId, jobTitle, title, text, companyName, pageId, createdAt, path` (`path` from env `NOTIFICATION_APPLICATION_ACCEPTED_PATH`, `{id}` = application id, default `/application/{id}`).',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['accepted', 'rejected'],
          example: 'accepted',
        },
      },
    },
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string().valid('accepted', 'rejected').required(),
        }),
      ),
    )
    body: { status: 'accepted' | 'rejected' },
    @Req() req: any,
  ) {
    return this.jobAppService.updateStatus(id, body.status, req.user.id);
  }
}
