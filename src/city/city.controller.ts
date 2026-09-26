import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CityService } from './city.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@ApiTags('Cities')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @ApiOperation({ summary: 'List cities (filter by countryId for Pakistan = 41)' })
  @ApiQuery({ name: 'countryId', required: false, example: 41 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'search', required: false })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        countryId: Joi.number().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(200).default(50),
        search: Joi.string().allow('').optional(),
      }),
    ),
  )
  async getCities(@Query() query: any) {
    return this.cityService.getCities({
      countryId: query.countryId ? Number(query.countryId) : undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by id' })
  async getCityById(@Param('id') id: string) {
    return this.cityService.getCityById(Number(id));
  }
}
