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
  @ApiOperation({
    summary: 'Create job',
    description:
      'Tag one or more categories via `filterIds` (preferred) or single `filterId`. Max 10.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'title',
        'description',
        'salaryType',
        'salaryAmount',
        'location',
      ],
      properties: {
        title: { type: 'string', example: 'Warehouse Helper' },
        filterIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 11, 17],
          description: 'One or more filter category ids (preferred)',
        },
        filterId: {
          type: 'number',
          example: 1,
          description: 'Legacy single category — use filterIds instead',
        },
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
        filterIds: Joi.array()
          .items(Joi.number().integer().positive())
          .min(1)
          .max(10)
          .unique()
          .optional(),
        filterId: Joi.number().integer().positive().optional(),
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
      })
        .or('filterIds', 'filterId')
        .messages({
          'object.missing': 'Provide filterIds or filterId',
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
  @ApiOperation({
    summary: 'Update job',
    description:
      'Optionally replace categories with `filterIds` (1–10) or legacy `filterId`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        filterIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 11, 17],
          description: 'Replace all job categories (1–10 ids)',
        },
        filterId: {
          type: 'number',
          description: 'Legacy single category — use filterIds instead',
        },
        pageId: { type: 'number' },
        requirements: { type: 'string' },
        benefits: { type: 'array', items: { type: 'string' } },
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
        },
        salaryAmount: { type: 'number' },
        currency: { type: 'string' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
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
  async patchJob(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(
      Joi.object({
        title: Joi.string().optional(),
        description: Joi.string().optional(),
        pageId: Joi.number().optional(),
        filterIds: Joi.array()
          .items(Joi.number().integer().positive())
          .min(1)
          .max(10)
          .unique()
          .optional(),
        filterId: Joi.number().integer().positive().optional(),
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
