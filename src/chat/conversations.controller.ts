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
import { ConversationsService, OpenDto } from './conversations.service';
import { MessagesService } from './messages.service';

const id = () => Joi.number().integer().positive();

const openSchema = Joi.object({
  type: Joi.string().valid('direct', 'job').required(),
  // direct: the person. job: only for the employer side (the applicant to contact)
  userId: Joi.when('type', { is: 'direct', then: id().required(), otherwise: id() }),
  jobId: Joi.when('type', { is: 'job', then: id().required(), otherwise: Joi.forbidden() }),
}).messages({
  'any.required': 'Send type "direct" with userId, or type "job" with jobId',
  'any.unknown': 'Send type "direct" with userId, or type "job" with jobId',
});

const sendSchema = Joi.object({
  content: Joi.string().allow(''),
  mediaUrl: Joi.string().max(2000),
  messageType: Joi.string().valid('text', 'image', 'video', 'audio', 'file'),
  clientMsgId: Joi.string().max(64),
});

const readSchema = Joi.object({ messageId: Joi.number().integer().positive() });

const muteSchema = Joi.object({
  muted: Joi.boolean().required(),
  hours: Joi.number().integer().min(1).max(24 * 365),
});

const cursor = (): MethodDecorator => (t, k, d) => {
  ApiQuery({ name: 'before', required: false, description: 'older than this message id (`nextCursor` of the previous page)' })(t, k, d);
  ApiQuery({ name: 'after', required: false, description: 'newer than this message id, oldest first (catch up after being offline)' })(t, k, d);
  ApiQuery({ name: 'limit', required: false, example: 30, description: 'max 100' })(t, k, d);
};

/**
 * Chat inbox: direct messages to anyone, and job chats (one per applicant per
 * job). Live updates come over the socket namespace `chat` (see the notes on
 * `ChatGateway`).
 */
@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller('chat')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Open a chat (get or create)',
    description: [
      'Idempotent: opening the same chat twice returns the same conversation.',
      '- **direct**: `{type:"direct", userId}` - a DM to any user (not yourself, not someone who blocked you / you blocked). New DMs per day are limited.',
      '- **job**: `{type:"job", jobId}` - the "Chat" button on a job. One chat per person per job, with or without applying; you cannot chat on a job that is closed (unless the chat already exists).',
      '  - The **employer side is the job team, not one person**: for a personal job the poster; for a job posted under a page the page owner + every current admin / editor. Any of them can open the same chat and reply; the applicant sees one thread. If the owner removes someone from the page they lose access at once and the owner / rest of the team carry on.',
      '  - The employer side starts a chat with someone who applied: `{type:"job", jobId, userId:<applicantId>}` (403 if that person did not apply). Applicants never send `userId`.',
      'A conversation appears in the inbox (`GET /chat/conversations`) after its first message.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['direct', 'job'], example: 'job' },
        jobId: { type: 'number', example: 12, description: 'type job' },
        userId: {
          type: 'number',
          example: 5,
          description: 'type direct: the person. type job: only the employer side, the applicant to contact',
        },
      },
    },
  })
  open(@Body(new JoiValidationPipe(openSchema)) body: OpenDto, @Req() req: any) {
    return this.conversations.open(req.user.id, body);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'My inbox',
    description:
      'Conversations with at least one message, newest activity first. Each has `other` (the other side: a person, or the page for a page job; `kind` says which), `role` (job chats: `applicant` or `employer`), `job`, `lastMessage`, `unreadCount`, `muted` and `blocked {byMe, byThem}`.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'max 50' })
  list(@Query('page') page: string, @Query('limit') limit: string, @Req() req: any) {
    return this.conversations.list(req.user.id, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Unread badge',
    description: 'Unread messages and in how many conversations, across the whole inbox.',
  })
  unread(@Req() req: any) {
    return this.conversations.unreadTotal(req.user.id);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'People I blocked' })
  blocks(@Req() req: any) {
    return this.conversations.listBlocks(req.user.id);
  }

  @Post('blocks/:userId')
  @ApiOperation({
    summary: 'Block a user',
    description: 'Neither of you can send messages to the other any more (existing history stays readable). Idempotent.',
  })
  block(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.conversations.block(req.user.id, userId);
  }

  @Delete('blocks/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  unblock(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.conversations.unblock(req.user.id, userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'One conversation' })
  get(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.conversations.get(req.user.id, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Messages of a conversation (cursor paging)',
    description:
      'Newest page first by default; messages inside a page are oldest -> newest. Scroll up with `before=<nextCursor>` until `hasMore` is false. Use `after=<lastSeenId>` to fetch what you missed while offline. Deleted messages stay as `deleted: true` with no content.',
  })
  @cursor()
  listMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('before') before: string,
    @Query('after') after: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.messages.list(req.user.id, id, {
      before: Number(before) || undefined,
      after: Number(after) || undefined,
      limit: Number(limit) || undefined,
    });
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a message (REST fallback of the socket event)',
    description: [
      'Text: `{content}` (max 1000). Media: upload with `POST /files/upload`, then `{messageType:"image"|"video"|"audio"|"file", mediaUrl, content?}`.',
      'Send a unique `clientMsgId` and retry freely: the same id is stored once (`duplicate: true` on a repeat).',
      'Members get it live as the socket event `message:new`; offline members get one merged push.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Is the job still open?' },
        mediaUrl: { type: 'string' },
        messageType: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'file'], default: 'text' },
        clientMsgId: { type: 'string', example: 'a1b2c3' },
      },
    },
  })
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(sendSchema)) body: any,
    @Req() req: any,
  ) {
    return this.messages.send(req.user.id, id, body);
  }

  @Post('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark as read',
    description: 'Moves my read position up to `messageId` (default: the latest). It never moves back. The other members see `conversation:read` live.',
  })
  @ApiBody({ schema: { type: 'object', properties: { messageId: { type: 'number' } } } })
  read(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(readSchema)) body: { messageId?: number },
    @Req() req: any,
  ) {
    return this.conversations.markRead(req.user.id, id, body.messageId);
  }

  @Patch('conversations/:id/mute')
  @ApiOperation({
    summary: 'Mute / unmute push notifications of a conversation',
    description: '`{muted:true}` mutes until unmuted, `{muted:true, hours:8}` for 8 hours, `{muted:false}` unmutes. Messages still arrive.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['muted'],
      properties: { muted: { type: 'boolean' }, hours: { type: 'number', example: 8 } },
    },
  })
  mute(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(muteSchema)) body: { muted: boolean; hours?: number },
    @Req() req: any,
  ) {
    return this.conversations.mute(req.user.id, id, body.muted, body.hours);
  }

  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Delete my message',
    description: 'Only the sender. The message stays in the chat as a deleted placeholder; members get `message:deleted` live.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.messages.remove(req.user.id, id);
  }
}
