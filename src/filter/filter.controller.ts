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
        icon: Joi.string().trim().optional(),
        iconSource: Joi.string()
          .valid('library', 'svg')
          .default('library'),
        iconLibrary: Joi.when('iconSource', {
          is: 'library',
          then: Joi.string()
            .valid('Feather', 'FontAwesome', 'FontAwesome5')
            .required(),
          otherwise: Joi.forbidden(),
        }),
        iconName: Joi.when('iconSource', {
          is: 'library',
          then: Joi.string().trim().required(),
          otherwise: Joi.forbidden(),
        }),
        iconColor: Joi.string()
          .trim()
          .pattern(/^#(?:[0-9a-fA-F]{3}){1,2}$/)
          .default('#2563EB'),
        iconSvgUrl: Joi.forbidden(),
        iconSvg: Joi.when('iconSource', {
          is: 'svg',
          then: Joi.string().max(8000).required(),
          otherwise: Joi.forbidden(),
        }),
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
      { iconLibrary: 'Feather', iconName: 'tool', name: 'Labor' },
      { iconLibrary: 'FontAwesome5', iconName: 'broom', name: 'Housekeeping' },
      { iconLibrary: 'FontAwesome5', iconName: 'motorcycle', name: 'Delivery' },
      { iconLibrary: 'FontAwesome5', iconName: 'utensils', name: 'Kitchen' },
      { iconLibrary: 'Feather', iconName: 'file-text', name: 'Admin' },
      { iconLibrary: 'Feather', iconName: 'more-horizontal', name: 'Other' },
      { iconLibrary: 'Feather', iconName: 'zap', name: 'Electrician' },
      { iconLibrary: 'FontAwesome5', iconName: 'faucet', name: 'Plumber' },
      { iconLibrary: 'FontAwesome5', iconName: 'car', name: 'Driver' },
      { iconLibrary: 'FontAwesome5', iconName: 'paint-roller', name: 'Painter' },
      { iconLibrary: 'Feather', iconName: 'shield', name: 'Security' },
      { iconLibrary: 'FontAwesome5', iconName: 'truck', name: 'Loader' },
      { iconLibrary: 'FontAwesome5', iconName: 'utensils', name: 'Cook' },
      { iconLibrary: 'Feather', iconName: 'settings', name: 'Mechanic' },
      { iconLibrary: 'FontAwesome5', iconName: 'spray-can', name: 'Cleaner' },
      { iconLibrary: 'Feather', iconName: 'briefcase', name: 'Office Helper' },
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
        iconSource: 'library',
        iconLibrary: item.iconLibrary,
        iconName: item.iconName,
        icon: item.iconName,
        iconColor: '#2563EB',
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
