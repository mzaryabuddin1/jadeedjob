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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FilterService } from './filter.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { toSentenceCase } from 'src/common/utils/utils.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { AuthService } from 'src/auth/auth.service';

@ApiTags('Filters')
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,
    private readonly authService: AuthService,
    @InjectRepository(Filter)
    private filterRepo: Repository<Filter>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create filter (JWT)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'icon'],
      properties: {
        name: { type: 'string', example: 'Construction' },
        icon: { type: 'string', example: "{ icon: 'hammer' }" },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          example: 'active',
        },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().trim().required(),
        icon: Joi.string()
          .trim()
          .pattern(/^\{\s*icon:\s*'[^']+'\s*\}$/)
          .required(),
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

  /** Public — approved + active. With Bearer token → preferred filters first */
  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'List approved filters (public)',
    description:
      'Optional Authorization: Bearer <token>. When logged in (and preference≠false), your filter_preferences come first, then the rest.',
  })
  async getFilter(@Req() req: any, @Query() query: any) {
    const userId =
      this.authService.tryGetUserIdFromAuthHeader(req.headers?.authorization) ??
      undefined;

    return this.filterService.getFilters(query, {
      approvedOnly: true,
      userId,
    });
  }

  /** Public — only if filter is approved and active */
  @Get(':id')
  @ApiOperation({ summary: 'Get filter by id (public)' })
  async getFilterById(@Param('id') id: string) {
    return this.filterService.filterById(Number(id), { approvedOnly: true });
  }
}
