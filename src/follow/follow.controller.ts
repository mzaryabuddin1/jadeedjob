import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FollowService } from './follow.service';

const cursorQueries = [
  ApiQuery({
    name: 'before',
    required: false,
    description: 'cursor: the `nextCursor` of the previous page',
  }),
  ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'max 50',
  }),
];
const withCursor = (): MethodDecorator => (t, k, d) => {
  cursorQueries.forEach((q) => q(t, k, d));
};

/** Follow / unfollow users and pages, and list followers / following */
@ApiTags('Follow')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller()
export class FollowController {
  constructor(private readonly follows: FollowService) {}

  // ── users ──

  @Post('users/:userId/follow')
  @ApiOperation({
    summary: 'Follow a user',
    description:
      'Idempotent: following twice is fine (`created` tells if it was new). Returns the new `followersCount`.',
  })
  followUser(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.follows.follow(req.user.id, 'user', userId);
  }

  @Delete('users/:userId/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  unfollowUser(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.follows.unfollow(req.user.id, 'user', userId);
  }

  @Get('users/:userId/followers')
  @ApiOperation({
    summary: 'Followers of a user',
    description:
      'Newest first with cursor paging. Each person carries `isFollowing` (do I follow them) so the app can render the Follow button.',
  })
  @withCursor()
  userFollowers(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.follows.listFollowers('user', userId, req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit),
    });
  }

  @Get('users/:userId/following')
  @ApiOperation({
    summary: 'Who a user follows (people and pages)',
    description:
      '`type`: `users`, `pages` or `all` (default). Each entry says `type: user | page`.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'users', 'pages'] })
  @withCursor()
  userFollowing(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('type') type: string,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const kind = type === 'users' || type === 'pages' ? type : 'all';
    return this.follows.listFollowing(userId, kind, req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit),
    });
  }

  // ── pages ──

  @Post('pages/:pageId/follow')
  @ApiOperation({
    summary: 'Follow a page',
    description:
      "Idempotent. Followers see the page's posts and reels in their feed.",
  })
  followPage(@Param('pageId', ParseIntPipe) pageId: number, @Req() req: any) {
    return this.follows.follow(req.user.id, 'page', pageId);
  }

  @Delete('pages/:pageId/follow')
  @ApiOperation({ summary: 'Unfollow a page' })
  unfollowPage(@Param('pageId', ParseIntPipe) pageId: number, @Req() req: any) {
    return this.follows.unfollow(req.user.id, 'page', pageId);
  }

  @Get('pages/:pageId/followers')
  @ApiOperation({ summary: 'Followers of a page' })
  @withCursor()
  pageFollowers(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.follows.listFollowers('page', pageId, req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit),
    });
  }
}
