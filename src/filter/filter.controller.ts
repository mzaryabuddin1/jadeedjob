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
import { PrismaService } from 'src/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,
    private readonly prisma: PrismaService,
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

    const existing = await this.prisma.filter.findFirst({
      where: { name: body.name },
    });

    if (existing) {
      throw new BadRequestException('Filter with this name already exists');
    }

    const createdFilter = await this.filterService.createFilter({
      ...body,
      createdBy: Number(req.user.id),
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
        preference_ids: Joi.array().items(Joi.number().integer()).optional(),
        approvalStatus: Joi.string()
          .valid('pending', 'approved', 'rejected')
          .optional(),
        createdBy: Joi.number().integer().optional(),
        sortBy: Joi.string()
          .valid('name', 'icon', 'status', 'approvalStatus', 'createdAt')
          .optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional(),
      }),
    ),
  )
  async getFilter(@Query() query: any) {
    return this.filterService.getFilters(query);
  }

  @Get(':id')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        id: Joi.number().required(),
      }),
    ),
  )
  async getFilterById(@Param() params: any) {
    return this.filterService.filterById(Number(params.id));
  }
}
