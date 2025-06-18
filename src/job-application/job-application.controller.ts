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
        job: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Invalid job ID format',
          }),
      }),
    ),
  )
  async apply(@Body() body: any, @Req() req: any) {
    return this.jobAppService.apply({
      ...body,
      applicant: req.user.id,
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

  @Get('job/:jobId')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        jobId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Invalid job ID format',
          }),
      }),
    ),
  )
  async getByJob(@Param('jobId') jobId: string) {
    return this.jobAppService.getApplicationsByJob(jobId);
  }

  @Patch(':id/status')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        id: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Invalid application ID format',
          }),
        status: Joi.string()
          .valid('pending', 'accepted', 'rejected')
          .required(),
      }),
    ),
  )
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.jobAppService.updateStatus(id, status);
  }
}
