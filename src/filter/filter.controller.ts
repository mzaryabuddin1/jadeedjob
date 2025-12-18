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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';

@UseGuards(JwtAuthGuard)
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,

    @InjectRepository(Filter)
    private filterRepo: Repository<Filter>,
  ) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().trim().required(),
        icon: Joi.string().trim().pattern(/^\{\s*icon:\s*'[^']+'\s*\}$/).required(),
        status: Joi.string().valid('active', 'inactive').default('active'),
      }),
    ),
  )
  async createFilter(@Body() body: any, @Req() req: any) {
    body.name = toSentenceCase(body.name);

    const existing = await this.filterRepo.findOne({
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
  async getFilter(@Query() query: any) {
    return this.filterService.getFilters(query);
  }

  @Get(':id')
  async getFilterById(@Param() params: any) {
    return this.filterService.filterById(Number(params.id));
  }

  @Post('seed')
  async seedFilters(@Req() req: any) {
    const FAKE_FILTERS = [
      { icon: 'wrench',      name: 'Labor' },
      { icon: 'broom',       name: 'Housekeeping' },
      { icon: 'motorcycle',  name: 'Delivery' },
      { icon: 'utensils',    name: 'Kitchen' },
      { icon: 'file-alt',    name: 'Admin' },
      { icon: 'ellipsis-h',  name: 'Other' },
      { icon: 'bolt',        name: 'Electrician' },
      { icon: 'tint',        name: 'Plumber' },
      { icon: 'car',         name: 'Driver' },
      { icon: 'paint-brush', name: 'Painter' },
      { icon: 'user-shield', name: 'Security' },
      { icon: 'truck',       name: 'Loader' },
      { icon: 'utensils',    name: 'Cook' },
      { icon: 'wrench',      name: 'Mechanic' },
      { icon: 'broom',       name: 'Cleaner' },
      { icon: 'briefcase',   name: 'Office Helper' },
    ];

    const created = [];

    for (const item of FAKE_FILTERS) {
      const name = toSentenceCase(item.name);

      const existing = await this.filterRepo.findOne({
        where: { name },
      });

      // Skip if already exists
      if (existing) continue;

      const filter = await this.filterService.createFilter({
        name,
        icon: item.icon,
        status: 'active',
        createdBy: Number(req.user.id),
      });

      created.push(filter);
    }

    return {
      message: 'Fake filters seeded successfully',
      count: created.length,
      filters: created,
    };
  }
  
}
