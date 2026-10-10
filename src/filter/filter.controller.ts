import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilterService } from './filter.service';
import { AuthService } from 'src/auth/auth.service';

@ApiTags('Filters')
@Controller('filters')
export class FilterController {
  constructor(
    private readonly filterService: FilterService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Public list. Icon is Tabler or custom SVG JSON.
   * `last_update_time` — if newer than client cache, re-fetch & re-cache.
   * Optional Bearer → preferred filters first.
   */
  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'List approved filters',
    description: [
      'Returns approved + active filters.',
      'Each `icon` is either `{ type: "tabler", name }` or `{ type: "custom", svg }`.',
      'Use `last_update_time` (ISO) for React Native cache invalidation.',
      'Optional Authorization: Bearer — preferred filters first.',
    ].join(' '),
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
      'Includes `last_update_time` and normalized `icon` (tabler | custom).',
  })
  async getFilterById(@Param('id') id: string) {
    return this.filterService.filterById(Number(id), { approvedOnly: true });
  }
}
