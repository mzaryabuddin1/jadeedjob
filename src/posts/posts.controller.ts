import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { PostsService } from './posts.service';

const createSchema = Joi.object({
  kind: Joi.string().valid('post', 'reel').required(),
  text: Joi.string().trim().allow(''),
  mediaIds: Joi.array().items(Joi.number().integer().positive()).max(10),
  thumbnailMediaId: Joi.number().integer().positive(),
  durationMs: Joi.number().integer().positive(),
  jobId: Joi.number().integer().positive(),
  pageId: Joi.number().integer().positive(),
});

const updateSchema = Joi.object({
  text: Joi.string().trim().allow(''),
  jobId: Joi.number().integer().positive().allow(null),
}).min(1);

const cursor = (): MethodDecorator => (t, k, d) => {
  ApiQuery({
    name: 'kind',
    required: false,
    enum: ['post', 'reel'],
    description: 'leave empty for both',
  })(t, k, d);
  ApiQuery({
    name: 'before',
    required: false,
    description: 'cursor: `nextCursor` of the previous page',
  })(t, k, d);
  ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'max 30',
  })(t, k, d);
};

const opts = (kind: string, before: string, limit: string) => ({
  kind,
  before: Number(before) || undefined,
  limit: Number(limit) || undefined,
});

/**
 * Posts and reels are one thing with a `kind`: a reel is one vertical video,
 * a post is text and/or up to 10 images (or one video). Publish as yourself
 * or as a page you manage (`pageId`).
 */
@ApiTags('Posts & Reels')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post('posts')
  @ApiOperation({
    summary: 'Publish a post or a reel',
    description: [
      'Upload files first with `POST /media/upload`, then send their ids here.',
      '- **reel**: `kind: "reel"` + exactly one video id in `mediaIds` (+ optional `thumbnailMediaId` image, `durationMs` up to 180 000, caption up to 2200).',
      '- **post**: `kind: "post"` + text and/or up to 10 images, or one video (text up to 3000).',
      '- **as a page**: add `pageId` (needs the owner / admin / editor role of that page).',
      "- **tag a job**: `jobId` - your own job (as a page: that page's job).",
      '- `#hashtags` in the text become searchable and feed trending.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['post', 'reel'], example: 'reel' },
        text: {
          type: 'string',
          example: 'We are hiring drivers in Karachi #hiring #drivers',
        },
        mediaIds: { type: 'array', items: { type: 'number' }, example: [12] },
        thumbnailMediaId: { type: 'number', example: 13 },
        durationMs: { type: 'number', example: 24000 },
        jobId: { type: 'number', example: 5 },
        pageId: { type: 'number', example: 2 },
      },
    },
  })
  create(
    @Body(new JoiValidationPipe(createSchema)) body: any,
    @Req() req: any,
  ) {
    return this.posts.create(req.user.id, body);
  }

  // static routes before `posts/:id`

  @Get('posts/feed')
  @ApiOperation({
    summary: 'My feed: posts and reels of people and pages I follow (and mine)',
    description:
      'Newest first with cursor paging. `kind=reel` gives a following-only reels feed.',
  })
  @cursor()
  feed(
    @Query('kind') kind: string,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.posts.feed(req.user.id, opts(kind, before, limit));
  }

  @Get('reels/feed')
  @ApiOperation({
    summary: 'Reels for you (discover)',
    description:
      'Public reels ranked by how well they are doing right now (likes, comments, shares, views, decayed by age; last 30 days). Page by `page` number because the ranking moves.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'max 30',
  })
  reels(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.posts.reelsFeed(req.user.id, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  @Get('posts/:id')
  @ApiOperation({
    summary: 'Get one post / reel',
    description:
      'Includes author, page, tagged job, counts and what *I* did (`viewer.liked`, `viewer.shared`, `viewer.canManage`).',
  })
  getOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.posts.getOne(req.user.id, id);
  }

  @Patch('posts/:id')
  @ApiOperation({
    summary: 'Edit text or tagged job',
    description:
      'Author (or page owner/admin/editor for page posts). Media cannot be changed. `jobId: null` removes the tag.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        jobId: { type: 'number', nullable: true },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(updateSchema)) body: any,
    @Req() req: any,
  ) {
    return this.posts.update(req.user.id, id, body);
  }

  @Delete('posts/:id')
  @ApiOperation({
    summary: 'Delete a post / reel (author, or page manager for page posts)',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.posts.remove(req.user.id, id);
  }

  @Get('users/:userId/posts')
  @ApiOperation({
    summary: 'Posts and reels a person published themselves',
    description:
      'The profile grid. Content they published as a page is on the page instead.',
  })
  @cursor()
  userPosts(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('kind') kind: string,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.posts.listByUser(
      req.user.id,
      userId,
      opts(kind, before, limit),
    );
  }

  @Get('pages/:pageId/posts')
  @ApiOperation({ summary: 'Posts and reels of a page' })
  @cursor()
  pagePosts(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Query('kind') kind: string,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.posts.listByPage(
      req.user.id,
      pageId,
      opts(kind, before, limit),
    );
  }
}
