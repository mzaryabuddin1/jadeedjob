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
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard)
@Controller('job-application')
export class JobApplicationController {
  constructor(private readonly jobAppService: JobApplicationService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async apply(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          job: Joi.number().integer().positive().optional(),
          jobId: Joi.number().integer().positive().optional(),
          bidAmount: Joi.number().positive().precision(2).optional(),
          bidCurrency: Joi.string().trim().max(12).optional(),
        })
          .or('job', 'jobId')
          .messages({
            'object.missing': 'jobId is required',
          }),
      ),
    )
    body: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    return this.jobAppService.apply({
      jobId: Number(body.jobId ?? body.job),
      applicantId: req.user.id,
      bidAmount: body.bidAmount,
      bidCurrency: body.bidCurrency,
      idempotencyKey,
    });
  }

  @Get('my')
  async getMyApplications(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: any,
  ) {
    return this.jobAppService.getApplicationsByUser(
      req.user.id,
      +page,
      +limit,
      status,
    );
  }

  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('status') status = 'completed',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.jobAppService.getApplicationHistory(
      req.user.id,
      status as any,
      Number(page),
      Number(limit),
    );
  }

  @Get('job/:jobId/received')
  async getReceivedByJob(
    @Param(
      new JoiValidationPipe(
        Joi.object({
          jobId: Joi.number().required(),
        }),
      ),
    )
    params: any,
    @Query(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid(
              'pending',
              'accepted',
              'rejected',
              'withdrawn',
              'completed',
              'all',
            )
            .default('all'),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
        }),
      ),
    )
    query: any,
    @Req() req: any,
  ) {
    return this.jobAppService.getReceivedApplicationsForJob(
      Number(params.jobId),
      req.user.id,
      {
        status: query.status,
        page: Number(query.page),
        limit: Number(query.limit),
      },
    );
  }

  @Get('job/:jobId')
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
  async updateStatus(
    @Param(
      new JoiValidationPipe(
        Joi.object({
          id: Joi.number().required(),
        }),
      ),
    )
    params: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('pending', 'accepted', 'rejected', 'withdrawn', 'completed')
            .required(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.jobAppService.updateStatus(
      Number(params.id),
      body.status,
      req.user.id,
    );
  }

  @Patch(':id/withdraw')
  async withdraw(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.jobAppService.withdraw(id, req.user.id);
  }
}
