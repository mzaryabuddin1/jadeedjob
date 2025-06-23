import {
  Controller,
  Post,
  Body,
  UsePipes,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { JobService } from './job.service';
import Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Auth-protected
@Controller('job')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly userService: UsersService,
  ) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        filter: Joi.string().required(),
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
     // 🔁 Convert lat/lng to GeoJSON format
    body.location = {
      type: 'Point',
      coordinates: [body.location.lng, body.location.lat],
    };
    return this.jobService.createJob(body);
  }

  @Get()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        filter: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // optional ObjectId
        page: Joi.number().min(1).optional(),
        limit: Joi.number().min(1).max(10).optional(),
        search: Joi.string().optional().allow(''),
        sortBy: Joi.string().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional(),
      }),
    ),
  )
  async findJobs(@Query() query: any) {
    return this.jobService.findJobs(query);
  }

  @Get('nearby')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        page: Joi.number().min(1).optional(),
        limit: Joi.number().min(1).max(10).optional(),
        search: Joi.string().optional().allow(""),
        sortBy: Joi.string().optional(), // optional, could default to 'createdAt' in service
        sortOrder: Joi.string().valid('asc', 'desc').optional(),
        radiusKm: Joi.number().min(1).max(10).optional(),
      }),
    ),
  )
  async findNearbyJobs(@Query() query: any) {
    const result = await this.jobService.findNearbyJobs(query);
    return result;
  }


}
