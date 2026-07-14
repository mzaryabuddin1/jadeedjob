import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { JobApplicationService } from './job-application.service';

@UseGuards(JwtAuthGuard)
@Controller('employer')
export class EmployerJobApplicationController {
  constructor(private readonly jobAppService: JobApplicationService) {}

  @Get('jobs/:jobId/applications')
  async getJobApplications(
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
            .valid('pending', 'accepted', 'rejected', 'withdrawn', 'completed', 'all')
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

  @Patch('job-applications/:id/status')
  async updateJobApplicationStatus(
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
}
