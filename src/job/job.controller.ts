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
} from '@nestjs/common';
import { JobService } from './job.service';
import Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

const JOB_TITLE_MAX_LENGTH = 35;
const jobTitleSchema = Joi.string().trim().max(JOB_TITLE_MAX_LENGTH).messages({
  'string.max': 'Title cannot exceed 35 characters',
});

@UseGuards(JwtAuthGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
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
  async createJob(@Body() body: any, @Req() req: any) {
    body.createdBy = req.user.id;
    return this.jobService.createJob(body, req.user.id);
  }

  @Get()
  async findJobs(@Query() query: any, @Req() req: any) {
    return this.jobService.findJobs(query, req.user.id);
  }

  @Get(':id')
  async findJob(@Param('id') id: number, @Req() req: any) {
    return this.jobService.findJobById(Number(id), req.user.id);
  }

  @Patch(':id')
  async patchJob(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(
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
    )) body: any,
    @Req() req: any,
  ) {
    return this.jobService.updateJob(id, body, req.user.id);
  }

  @Patch(':id/status')
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
  async deleteJob(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.jobService.closeJob(id, req.user.id);
  }
}
