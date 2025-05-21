import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UsePipes,
  BadRequestException,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { FilterService } from './filter.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { toSentenceCase } from 'src/common/utils/utils.util';
import { Filter } from 'src/filter/filter.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@UseGuards(JwtAuthGuard) // Auth-protected
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,
    @InjectModel(Filter.name) private filterModel: Model<Filter>,
  ) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().required(),
        status: Joi.string().valid('active', 'inactive').default('active'),
      }),
    ),
  )
  async createFilter(@Body() body: any, @Req() req: any) {
    body.name = toSentenceCase(body.name);

    const existing = await this.filterModel.findOne({
      name: { $regex: `^${body.name}$`, $options: 'i' }, // Case-insensitive match
    });

    if (existing) {
      throw new BadRequestException('Filter with this name already exists');
    }

    const createdFilter = await this.filterService.createFilter({
      ...body,
      approvalStatus: 'pending',
      rejectionReason: null,
      createdBy: req.user.id, // From JWT
    });

    return {
      message: 'Filter submitted for review',
      filter: createdFilter,
    };
  }

  @Get()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().allow('').optional(),
        preference_ids: Joi.array().items(Joi.string().length(24)).optional(),
        approvalStatus: Joi.string()
          .valid('pending', 'approved', 'rejected')
          .optional(),
        createdBy: Joi.string().length(24).optional(),
        sortBy: Joi.string()
          .valid('name', 'icon', 'status', 'approvalStatus', 'createdAt')
          .optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional(),
      }),
    ),
  )
  async getFilter(@Query() query: any) {
    const result = await this.filterService.getFilters(query);
    return result;
  }

  @Get(':id')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        id: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Invalid country ID format',
          }),
      }),
    ),
  )
  async getCountryById(@Param() params: any) {
    return this.filterService.FilterById(params.id);
  }
}
