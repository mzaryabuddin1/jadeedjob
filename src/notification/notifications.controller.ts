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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationInbox } from './notification-inbox.service';

/** The bell screen of the app: a person's own notification list. */
@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly inbox: NotificationInbox) {}

  @Get()
  @ApiOperation({
    summary: 'My notifications (newest first)',
    description: [
      'Cursor paging for infinite scroll: pass the previous `nextCursor` as `before` until `hasMore` is false.',
      'Each item: `id`, `type`, `title`, `body`, `path` (deep link to open on tap), `data` (ids, names, ...), `read`, `readAt`, `createdAt`. The response also has `unreadCount` for the badge.',
      '`type` values: `job_created` (a new job in my interests), `job_application` (someone applied to my job), `application_accepted`, `new_follower`, `post_like`, `post_comment`, `page_invitation`, `page_invitation_accepted`, `page_verified`, `page_verification_rejected`, `page_unverified`. Chat messages are not here: they have their own inbox (`GET /chat/conversations`).',
      'Everything that is pushed is stored here too, even when push / email is turned off in settings.',
    ].join('\n'),
  })
  @ApiQuery({ name: 'before', required: false, description: 'cursor: `nextCursor` of the previous page' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'max 50' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'type', required: false, example: 'job_application', description: 'only this type' })
  list(
    @Query('before') before: string,
    @Query('limit') limit: string,
    @Query('unreadOnly') unreadOnly: string,
    @Query('type') type: string,
    @Req() req: any,
  ) {
    return this.inbox.list(req.user.id, {
      before: Number(before) || undefined,
      limit: Number(limit) || undefined,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      type: type?.trim() || undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Unread badge',
    description: 'Number of unread notifications. Refresh it when the socket event `notification:new` arrives.',
  })
  async unread(@Req() req: any) {
    return { unreadCount: await this.inbox.unreadCount(req.user.id) };
  }

  // static routes before `:id`

  @Post('read-all')
  @ApiOperation({
    summary: 'Mark all as read',
    description: 'Optionally only one `type`.',
  })
  @ApiQuery({ name: 'type', required: false, example: 'new_follower' })
  readAll(@Query('type') type: string, @Req() req: any) {
    return this.inbox.markAllRead(req.user.id, type?.trim() || undefined);
  }

  @Delete()
  @ApiOperation({
    summary: 'Clear my list',
    description: 'Deletes every notification, or only the ones already read with `onlyRead=true`.',
  })
  @ApiQuery({ name: 'onlyRead', required: false, type: Boolean, example: false })
  clear(@Query('onlyRead') onlyRead: string, @Req() req: any) {
    return this.inbox.clear(req.user.id, onlyRead === 'true' || onlyRead === '1');
  }

  @Post(':id/read')
  @ApiOperation({
    summary: 'Mark one as read',
    description: 'Idempotent. Call it when the person opens the notification. Returns the item and the new `unreadCount`.',
  })
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inbox.markRead(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one notification' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inbox.remove(req.user.id, id);
  }
}
