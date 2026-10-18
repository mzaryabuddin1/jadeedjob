import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DiscoverService, cleanQuery } from './discover.service';

const paging = (): MethodDecorator => (t, k, d) => {
  ApiQuery({ name: 'page', required: false, example: 1 })(t, k, d);
  ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'max 50',
  })(t, k, d);
};

/** The app's Discover tab: search people, pages, posts and reels */
@ApiTags('Discover')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Search people',
    description:
      'Matches username, first/last name and headline (min 2 characters). Exact username first, then names starting with the text, then the most followed. Each result has `isFollowing` for the Follow button. Open a profile with `GET /users/:id/profile`.',
  })
  @ApiQuery({ name: 'q', required: true, example: 'ali' })
  @paging()
  users(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.discover.searchUsers(cleanQuery(q), req.user.id, {
      page,
      limit,
    });
  }

  @Get('pages')
  @ApiOperation({
    summary: 'Search pages',
    description:
      'Matches page name, username, business name and industry. Verified and bigger pages rank first. Open a page with `GET /pages/:id`.',
  })
  @ApiQuery({ name: 'q', required: true, example: 'logistics' })
  @paging()
  pages(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.discover.searchPages(cleanQuery(q), req.user.id, {
      page,
      limit,
    });
  }

  @Get('posts')
  @ApiOperation({
    summary: 'Search posts and reels',
    description:
      'Words in the text, or a hashtag with `#` (e.g. `q=#hiring`). Popular and recent first. Items are the same post objects as the feeds (author, page, tagged job, counts, `viewer.liked`).',
  })
  @ApiQuery({ name: 'q', required: true, example: '#hiring' })
  @ApiQuery({ name: 'kind', required: false, enum: ['post', 'reel'] })
  @paging()
  posts(
    @Query('q') q: string,
    @Query('kind') kind: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.discover.searchPosts(cleanQuery(q), req.user.id, {
      kind,
      page,
      limit,
    });
  }

  @Get('reels')
  @ApiOperation({
    summary: 'Search reels only',
    description: 'Same as `/discover/posts` with `kind=reel`.',
  })
  @ApiQuery({ name: 'q', required: true, example: 'driver' })
  @paging()
  reels(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.discover.searchPosts(cleanQuery(q), req.user.id, {
      kind: 'reel',
      page,
      limit,
    });
  }

  @Get('hashtags')
  @ApiOperation({
    summary: 'Hashtag suggestions',
    description:
      'Tags starting with the text, with how many live posts use them. Use while the person types `#...`.',
  })
  @ApiQuery({ name: 'q', required: true, example: 'hir' })
  hashtags(@Query('q') q: string) {
    return this.discover.hashtags(cleanQuery(q, 1));
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search everything at once (the search box)',
    description:
      'Returns 5 people, 5 pages, 5 posts, 5 reels and 5 hashtags for the text. Start the text with `#` to search hashtags and tagged posts only. Open a group with its own endpoint for more.',
  })
  @ApiQuery({ name: 'q', required: true, example: 'logistics' })
  search(@Query('q') q: string, @Req() req: any) {
    return this.discover.searchAll(cleanQuery(q), req.user.id);
  }

  @Get('home')
  @ApiOperation({
    summary: 'Discover home (before the person types)',
    description:
      'Trending hashtags (last 3 days), trending reels, people to follow (same city first, then most followed) and pages to follow (verified first). People/pages already followed are left out.',
  })
  home(@Req() req: any) {
    return this.discover.home(req.user.id);
  }
}
