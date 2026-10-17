import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
  UsePipes,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
      'Push/email follow the owner\'s `notification-settings`. Push `data`: `type=job_application, jobId, jobTitle, title, text, count, totalApplications, applicantIds, applicantNames, applicationId, createdAt, path`.',
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
  @ApiOperation({ summary: 'Applications for a job' })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        jobId: Joi.number().required(),
      }),
    ),
  )
  async getByJob(@Param('jobId') jobId: number) {
    return this.jobAppService.getApplicationsByJob(Number(jobId));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'accepted', 'rejected'],
          example: 'accepted',
        },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        id: Joi.number().required(),
        status: Joi.string()
          .valid('pending', 'accepted', 'rejected')
          .required(),
      }),
    ),
  )
  async updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.jobAppService.updateStatus(Number(id), status);
  }
}
