import {
  Body,
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
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PostEngagementService } from './post-engagement.service';

const commentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
  parentId: Joi.number().integer().positive(),
});

const shareSchema = Joi.object({
  channel: Joi.string().valid('link', 'chat', 'external'),
});

const paging =
  (name = 'before'): MethodDecorator =>
  (t, k, d) => {
    ApiQuery({
      name,
      required: false,
      description: 'cursor: `nextCursor` of the previous page',
    })(t, k, d);
    ApiQuery({
      name: 'limit',
      required: false,
      example: 20,
      description: 'max 50',
    })(t, k, d);
  };

/** Likes, comments and shares of posts and reels */
@ApiTags('Posts & Reels')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller()
export class PostEngagementController {
  constructor(private readonly engagement: PostEngagementService) {}

  // ── likes ──

  @Post('posts/:id/like')
  @ApiOperation({
    summary: 'Like a post / reel',
    description:
      'Idempotent (double taps count once). The author is notified in a batch ("Ali and 4 others liked your reel"), never one push per like.',
  })
  like(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.engagement.like(req.user.id, id);
  }

  @Delete('posts/:id/like')
  @ApiOperation({ summary: 'Remove my like' })
  unlike(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.engagement.unlike(req.user.id, id);
  }

  @Get('posts/:id/likes')
  @ApiOperation({ summary: 'Who liked it (newest first)' })
  @paging()
  likes(
    @Param('id', ParseIntPipe) id: number,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.engagement.listLikes(id, req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  // ── comments ──

  @Post('posts/:id/comments')
  @ApiOperation({
    summary: 'Comment on a post / reel, or reply to a comment',
    description:
      'Text 1-1000 characters. Send `parentId` to reply; replies are one level deep (a reply to a reply attaches to the top comment). The author / the replied person is notified in a batch.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', example: 'Is this job still open?' },
        parentId: { type: 'number', example: 7 },
      },
    },
  })
  comment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(commentSchema)) body: any,
    @Req() req: any,
  ) {
    return this.engagement.comment(req.user.id, id, body.text, body.parentId);
  }

  @Get('posts/:id/comments')
  @ApiOperation({
    summary: 'Comments of a post (newest first)',
    description:
      'Top-level comments only; each has `repliesCount` - load them with `GET /comments/:id/replies`.',
  })
  @paging()
  comments(
    @Param('id', ParseIntPipe) id: number,
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.engagement.listComments(id, req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Replies of a comment (oldest first)' })
  @paging('after')
  replies(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query('after') after: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.engagement.listReplies(commentId, req.user.id, {
      after: Number(after) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  @Delete('comments/:commentId')
  @ApiOperation({
    summary: 'Delete a comment',
    description:
      "Allowed for the comment's author, the post's author and page owner/admin/editor. Deleting a top comment removes its replies too.",
  })
  deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    return this.engagement.deleteComment(req.user.id, commentId);
  }

  // ── shares ──

  @Post('posts/:id/share')
  @ApiOperation({
    summary: 'Record a share and get the link',
    description:
      'Call it when the person shares (copies the link, sends it in chat, or uses the system share sheet). `channel`: `link` (default), `chat`, `external`. A person counts once per post. Returns `shareUrl` (set env `APP_SHARE_URL`, `{id}` = post id).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', enum: ['link', 'chat', 'external'] },
      },
    },
  })
  share(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(shareSchema)) body: any,
    @Req() req: any,
  ) {
    return this.engagement.share(req.user.id, id, body?.channel ?? 'link');
  }

  @Get('posts/:id/share-link')
  @ApiOperation({ summary: 'The link to share (does not count as a share)' })
  shareLink(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.engagement.shareLink(id, req.user.id);
  }
}
