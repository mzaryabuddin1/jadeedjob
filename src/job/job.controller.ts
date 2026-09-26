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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @ApiOperation({ summary: 'Create job' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'title',
        'filterId',
        'description',
        'salaryType',
        'salaryAmount',
        'location',
      ],
      properties: {
        title: { type: 'string', example: 'Warehouse Helper' },
        filterId: { type: 'number', example: 1 },
        description: { type: 'string', example: 'Need helpers for loading' },
        pageId: { type: 'number', nullable: true },
        requirements: { type: 'string' },
        benefits: { type: 'array', items: { type: 'string' }, example: ['Meals'] },
        shifts: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['morning', 'evening', 'night', 'rotational'],
          },
        },
        jobTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'full-time',
              'part-time',
              'contract',
              'temporary',
              'freelance',
              'internship',
            ],
          },
        },
        salaryType: {
          type: 'string',
          enum: [
            'piece-rate',
            'daily-wage',
            'hourly',
            'monthly',
            'fixed',
            'commission',
            'negotiable',
          ],
          example: 'daily-wage',
        },
        salaryAmount: { type: 'number', example: 1500 },
        currency: { type: 'string', example: 'PKR' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 24.8607 },
            lng: { type: 'number', example: 67.0011 },
          },
        },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        industry: { type: 'string' },
        educationLevel: { type: 'string' },
        experienceRequired: { type: 'string' },
        languageRequirements: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        title: Joi.string().required(),
        filterId: Joi.number().required(),
        description: Joi.string().required(),
        pageId: Joi.number().optional(),
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
    body.createdBy = req.user.id;
    return this.jobService.createJob(body, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs' })
  async findJobs(@Query() query: any, @Req() req: any) {
    return this.jobService.findJobs(query, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by id' })
  async findJob(@Param('id') id: number) {
    return this.jobService.findJobById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job' })
  async patchJob(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(
      Joi.object({
        title: Joi.string().optional(),
        description: Joi.string().optional(),
        pageId: Joi.number().optional(),
        filterId: Joi.number().optional(),
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
          .optional(),
        salaryAmount: Joi.number().optional(),
        currency: Joi.string().optional(),

        location: Joi.object({
          lat: Joi.number().required(),
          lng: Joi.number().required(),
        }).optional(),

        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        industry: Joi.string().optional(),
        educationLevel: Joi.string().optional(),
        experienceRequired: Joi.string().optional(),
        languageRequirements: Joi.array().items(Joi.string()).optional(),
      }),
    )) body: any,
    @Req() req: any,
  ) {
    return this.jobService.updateJob(id, body, req.user.id);
  }

}
