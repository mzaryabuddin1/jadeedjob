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
import { JobApplicationService } from './job-application.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@UseGuards(JwtAuthGuard)
@Controller('job-application')
export class JobApplicationController {
  constructor(private readonly jobAppService: JobApplicationService) {}

  @Post()
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
  async getMyApplications(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.jobAppService.getApplicationsByUser(req.user.id, +page, +limit);
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
            .valid('pending', 'accepted', 'rejected', 'all')
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
            .valid('pending', 'accepted', 'rejected')
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
}
