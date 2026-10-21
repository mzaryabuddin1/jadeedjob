import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { NotificationService } from 'src/notification/notification.service';
import { ConversationsService } from './conversations.service';

const num = (v: string | undefined, fallback: number) =>
  v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : fallback;

const preview = (m: Pick<ConversationMessage, 'messageType' | 'content'>) => {
  if (m.messageType === 'text') {
    const t = (m.content ?? '').replace(/\s+/g, ' ').trim();
    return t.length > 120 ? `${t.slice(0, 117)}...` : t;
  }
  return (
    { image: 'Sent a photo', video: 'Sent a video', audio: 'Sent a voice message', file: 'Sent a file' } as Record<string, string>
  )[m.messageType] ?? 'Sent a message';
};

/**
 * Push / email for chat messages, one merged notification per conversation
 * and recipient ("3 new messages") - never one per message. It waits a few
 * seconds and, if the person opened the chat in the meantime (their read
 * position moved past the message), sends nothing: online readers are not
 * pinged. Muted conversations are skipped.
 *
 * Env: CHAT_NOTIFY_DELAY_SECONDS (8), CHAT_NOTIFY_MIN_GAP_SECONDS (30),
 *      NOTIFICATION_CHAT_PATH (`/chat/{id}`)
 */
@Injectable()
export class ChatNotifier implements OnModuleInit {
  private readonly logger = new Logger(ChatNotifier.name);

  constructor(
    private readonly queue: NotificationQueueService,
    private readonly notifications: NotificationService,
    private readonly conversations: ConversationsService,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    this.queue.register('chat_message', {
      delaySeconds: num(process.env.CHAT_NOTIFY_DELAY_SECONDS, 8),
      minGapSeconds: num(process.env.CHAT_NOTIFY_MIN_GAP_SECONDS, 30),
      handler: (items) => this.flush(items),
    });
  }

  /** after a message was stored. Never throws. */
  async onMessage(conv: Conversation, msg: ConversationMessage, memberIds: number[]) {
    try {
      const recipients = memberIds.filter((id) => id !== msg.senderId);
      if (!recipients.length) return;
      // people who never opened the chat have no row yet = not muted
      const members = await this.memberRepo.find({
        where: { conversationId: conv.id, userId: In(recipients) },
      });
      const now = new Date();
      for (const userId of recipients) {
        const m = members.find((x) => x.userId === userId);
        if (m?.mutedUntil && m.mutedUntil > now) continue;
        await this.queue.enqueue({
          type: 'chat_message',
          groupKey: `chat:${conv.id}:${userId}`,
          recipientId: userId,
          payload: { conversationId: conv.id, messageId: msg.id },
        });
      }
    } catch (err) {
      this.logger.error(`Could not queue chat notification: ${(err as Error)?.message}`);
    }
  }

  private async flush(items: NotificationQueueItem[]) {
    const recipientId = items[0].recipientId;
    const conversationId = items[0].payload!.conversationId as number;
    const ids = items.map((i) => i.payload!.messageId as number);

    const conv = await this.msgRepo.manager.findOne(Conversation, { where: { id: conversationId } });
    // access is re-checked now: someone removed from the page team gets nothing
    if (!conv || !(await this.conversations.hasAccess(conv, recipientId))) {
      return { status: 'skipped' as const, note: 'no longer has access' };
    }
    const member = await this.memberRepo.findOne({ where: { conversationId, userId: recipientId } });
    if (member?.mutedUntil && member.mutedUntil > new Date()) {
      return { status: 'skipped' as const, note: 'muted' };
    }
    const lastRead = member?.lastReadMessageId ?? 0;

    const unread = (
      await this.msgRepo.find({
        where: { id: In(ids), conversationId },
        order: { id: 'ASC' },
      })
    ).filter((m) => !m.deletedAt && m.id > lastRead);
    if (!unread.length) return { status: 'skipped' as const, note: 'already read' };

    const last = unread[unread.length - 1];
    const sender = await this.userRepo.findOne({
      where: { id: last.senderId },
      select: ['id', 'firstName', 'lastName'],
    });
    const name = `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim() || 'Someone';

    // a job chat says which job it is about
    let title = name;
    if (conv.jobId) {
      const job = await this.jobRepo.findOne({ where: { id: conv.jobId }, select: ['id', 'title'] });
      if (job) title = `${name} · ${job.title}`;
    }

    const body =
      unread.length === 1 ? preview(last) : `${unread.length} new messages: ${preview(last)}`;
    const res = await this.notifications.notifyUser(recipientId, {
      title,
      body,
      data: {
        type: 'chat_message',
        conversationId,
        messageId: last.id,
        senderId: last.senderId,
        senderName: name,
        count: unread.length,
        path: (process.env.NOTIFICATION_CHAT_PATH || '/chat/{id}').replace('{id}', String(conversationId)),
      },
    });
    return {
      status: 'sent' as const,
      note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
    };
  }
}
