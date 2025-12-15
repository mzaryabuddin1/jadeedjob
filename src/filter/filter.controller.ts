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
}
