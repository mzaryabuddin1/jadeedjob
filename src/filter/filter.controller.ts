import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilterService } from './filter.service';
import { AuthService } from 'src/auth/auth.service';

const filterIconSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['type', 'name'],
      properties: {
        type: { type: 'string', enum: ['tabler'], example: 'tabler' },
        name: {
          type: 'string',
          example: 'briefcase',
          description:
            'Tabler icon slug for RN `@tabler/icons-react-native` (e.g. briefcase → IconBriefcase)',
        },
      },
    },
    {
      type: 'object',
      required: ['type', 'svg'],
      properties: {
        type: { type: 'string', enum: ['custom'], example: 'custom' },
        svg: {
          type: 'string',
          example: '<svg viewBox="0 0 24 24">...</svg>',
        },
      },
    },
  ],
};

const filterItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', example: 15 },
    name: { type: 'string', example: 'Office helper' },
    icon: filterIconSchema,
    status: { type: 'string', example: 'active' },
    approvalStatus: { type: 'string', example: 'approved' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Filters')
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'List approved filters',
    description: [
      'Returns **approved + active** job category filters.',
      '',
      '### Icon',
      '- Tabler: `{ "type": "tabler", "name": "briefcase" }` → parse with `@tabler/icons-react-native`',
      '- Custom: `{ "type": "custom", "svg": "<svg>...</svg>" }`',
      '',
      '### Cache (React Native)',
      'Compare `last_update_time` (ISO) with local cache. If newer → re-fetch and re-cache.',
      '',
      '### Preferences order',
      'Optional `Authorization: Bearer <token>`. When logged in and `preference` ≠ false, your `filter_preferences` appear first.',
      'Seed: `npm run seed:filters`',
    ].join('\n'),
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by filter name',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({
    name: 'preference',
    required: false,
    type: Boolean,
    description:
      'Default true. When Bearer present, preferred filters first. Set false to skip.',
    example: true,
  })
  @ApiOkResponse({
    description: 'Paginated filters with cache timestamp',
    schema: {
      type: 'object',
      properties: {
        last_update_time: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2026-10-10T16:09:41.926Z',
          description: 'Max updatedAt of listed filters — use for client cache invalidation',
        },
        data: {
          type: 'array',
          items: filterItemSchema,
        },
        total: { type: 'number', example: 25 },
        totalPages: { type: 'number', example: 2 },
        currentPage: { type: 'number', example: 1 },
      },
    },
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

  @Get(':id')
  @ApiOperation({
    summary: 'Get filter by id',
    description:
      'Returns one approved + active filter with normalized `icon` and global `last_update_time`.',
  })
  @ApiParam({ name: 'id', type: Number, example: 15 })
  @ApiOkResponse({
    description: 'Filter detail',
    schema: {
      type: 'object',
      properties: {
        last_update_time: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        filter: filterItemSchema,
      },
    },
  })
  async getFilterById(@Param('id') id: string) {
    return this.filterService.filterById(Number(id), { approvedOnly: true });
  }
}
