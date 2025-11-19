import { Controller, Get, Query, Param, UsePipes } from '@nestjs/common';
import { CountryService } from './country.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().allow('').optional(),
        sortBy: Joi.string()
          .valid('name', 'dial_code', 'code')
          .optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional(),
      }),
    ),
  )
  async getAllCountries(@Query() query: any) {
    return this.countryService.getAllCountries({
      limit: +query.limit,
      page: +query.page,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get(':id')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        id: Joi.number().required(),
      }),
    ),
  )
  async getCountryById(@Param() params: any) {
    return this.countryService.getCountryById(Number(params.id));
  }
}
