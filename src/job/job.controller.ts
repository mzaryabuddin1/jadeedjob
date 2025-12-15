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
} from '@nestjs/common';
import { JobService } from './job.service';
import Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        filterId: Joi.number().required(),
        description: Joi.string().required(),
        requirements: Joi.string().optional(),
        benefits: Joi.array().items(Joi.string()).optional(),
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

        location: Joi.object({
          lat: Joi.number().required(),
          lng: Joi.number().required(),
        }).required(),

        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        industry: Joi.string().optional(),
        educationLevel: Joi.string().optional(),
        experienceRequired: Joi.string().optional(),
        languageRequirements: Joi.array().items(Joi.string()).optional(),
      }),
    ),
  )
  async createJob(@Body() body: any, @Req() req: any) {
    body.createdBy = req.user.id
    return this.jobService.createJob(body);
  }

  @Get()
  async findJobs(@Query() query: any) {
    return this.jobService.findJobs(query);
  }

@Get(':id')
async findJob(@Param('id') id: number) {
  return this.jobService.findJobById(id);
}
 
}
