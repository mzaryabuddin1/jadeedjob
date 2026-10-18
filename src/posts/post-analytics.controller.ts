import {
  Body,
  Controller,
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
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PostAnalyticsService } from './post-analytics.service';

const eventsSchema = Joi.object({
  events: Joi.array()
    .items(
      Joi.object({
        postId: Joi.number().integer().positive().required(),
        type: Joi.string().valid('impression', 'view').required(),
        watchMs: Joi.number().integer().min(0).max(36_000_000),
        completed: Joi.boolean(),
      }),
    )
    .min(1)
    .max(50)
    .required(),
});

@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 240, ttl: 60000 } })
@Controller()
export class PostAnalyticsController {
  constructor(private readonly analytics: PostAnalyticsService) {}

  @Post('posts/events')
  @ApiOperation({
    summary: 'Report impressions and views (batched)',
    description: [
      'The app collects events and sends them every few seconds (1-50 per call) instead of one request per scroll.',
      '- `impression`: the post/reel appeared in a feed.',
      '- `view`: the person actually watched or opened it. For reels send `watchMs` (how long they watched) and `completed: true` when they reached the end.',
      'Views of your own content, deleted posts and unknown ids are ignored. Returns `{ accepted, ignored }`.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['events'],
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: ['postId', 'type'],
            properties: {
              postId: { type: 'number', example: 12 },
              type: { type: 'string', enum: ['impression', 'view'] },
              watchMs: { type: 'number', example: 18000 },
              completed: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  })
  events(
    @Body(new JoiValidationPipe(eventsSchema)) body: any,
    @Req() req: any,
  ) {
    return this.analytics.record(req.user.id, body.events);
  }

  @Get('posts/:id/analytics')
  @ApiOperation({
    summary: 'Performance of one post / reel',
    description: [
      'Author only (page posts: page owner or admin).',
      '`totals` and `daily` cover the last `days` (UTC days, zero-filled); `lifetime` are all-time counters (`reach` = unique viewers).',
      '`rates`: viewRate = views / impressions, avgWatchMs, completionRate = completed views / views, engagementRate = (likes + comments + shares) / views.',
      '`likes` per day are new likes (an unlike does not reduce a past day).',
    ].join('\n'),
  })
  @ApiQuery({ name: 'days', required: false, example: 7, description: '1-90' })
  postAnalytics(
    @Param('id', ParseIntPipe) id: number,
    @Query('days') days: string,
    @Req() req: any,
  ) {
    return this.analytics.postAnalytics(req.user.id, id, Number(days) || 7);
  }

  @Get('analytics/overview')
  @ApiOperation({
    summary: 'Overview of everything I (or my page) published',
    description:
      'Totals and daily series for the period, posts vs reels, followers gained per day, number published and the top 5 posts by views. Add `pageId` for a page (owner / admin).',
  })
  @ApiQuery({ name: 'days', required: false, example: 30, description: '1-90' })
  @ApiQuery({ name: 'pageId', required: false })
  overview(
    @Query('days') days: string,
    @Query('pageId') pageId: string,
    @Req() req: any,
  ) {
    return this.analytics.overview(
      req.user.id,
      Number(days) || 30,
      Number(pageId) || undefined,
    );
  }
}
