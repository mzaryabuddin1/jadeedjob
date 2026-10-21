import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import {
  ConversationMessage,
  MESSAGE_TYPES,
  MessageType,
} from './entities/conversation-message.entity';
import { ConversationsService, personView } from './conversations.service';
import { ChatEvents } from './chat-events.service';
import { ChatNotifier } from './chat-notifier';

export const MESSAGE_TEXT_MAX = 1000;

export type SendDto = {
  content?: string;
  mediaUrl?: string;
  messageType?: MessageType;
  clientMsgId?: string;
};

/** at most this many messages per user in this window (spam / runaway client guard) */
const RATE_LIMIT = { count: 20, windowMs: 10_000 };

@Injectable()
export class MessagesService {
  /** userId -> recent send times (per instance; move to Redis when scaled out) */
  private readonly recent = new Map<number, number[]>();

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
    private readonly conversations: ConversationsService,
    private readonly events: ChatEvents,
    private readonly notifier: ChatNotifier,
  ) {}

  // ────────────────────────────────────────────────
  // SEND
  // ────────────────────────────────────────────────

  async send(userId: number, conversationId: number, dto: SendDto) {
    const { conv, member } = await this.conversations.requireAccess(conversationId, userId);
    const messageType: MessageType = dto.messageType ?? (dto.mediaUrl ? 'file' : 'text');
    const content = dto.content?.trim() || null;
    const mediaUrl = dto.mediaUrl?.trim() || null;

    if (!MESSAGE_TYPES.includes(messageType)) {
      throw new BadRequestException('Unknown messageType');
    }
    if (messageType === 'text') {
      if (!content) throw new BadRequestException('Text messages must include content');
    } else if (!mediaUrl) {
      throw new BadRequestException('Media messages must include mediaUrl');
    }
    if (content && content.length > MESSAGE_TEXT_MAX) {
      throw new BadRequestException(`A message can be at most ${MESSAGE_TEXT_MAX} characters`);
    }
    if (dto.clientMsgId && dto.clientMsgId.length > 64) {
      throw new BadRequestException('clientMsgId can be at most 64 characters');
    }

    // a retry of the same message returns the stored one instead of sending twice
    if (dto.clientMsgId) {
      const dup = await this.msgRepo.findOne({
        where: { conversationId, senderId: userId, clientMsgId: dto.clientMsgId },
      });
      if (dup) return { ...(await this.views([dup]))[0], duplicate: true };
    }

    await this.conversations.assertCanSend(conv, userId);
    this.checkRate(userId);

    let saved: ConversationMessage;
    try {
      saved = await this.msgRepo.save(
        this.msgRepo.create({
          conversationId,
          senderId: userId,
          messageType,
          content,
          mediaUrl: messageType === 'text' ? null : mediaUrl,
          clientMsgId: dto.clientMsgId ?? null,
        }),
      );
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY' && dto.clientMsgId) {
        const dup = await this.msgRepo.findOneOrFail({
          where: { conversationId, senderId: userId, clientMsgId: dto.clientMsgId },
        });
        return { ...(await this.views([dup]))[0], duplicate: true };
      }
      throw err;
    }

    await Promise.all([
      this.convRepo.update(conv.id, { lastMessageId: saved.id, lastMessageAt: saved.createdAt }),
      // my own message is read by me
      this.memberRepo.update(member.id, { lastReadMessageId: saved.id }),
    ]);

    const view = (await this.views([saved]))[0];
    this.events.emitToUsers(await this.conversations.audience(conv), 'message:new', {
      conversationId: conv.id,
      message: view,
    });
    void this.conversations
      .recipientsFor(conv, userId)
      .then((recipients) => this.notifier.onMessage(conv, saved, recipients));
    return view;
  }

  private checkRate(userId: number) {
    const now = Date.now();
    const list = (this.recent.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
    if (list.length >= RATE_LIMIT.count) {
      throw new HttpException('You are sending messages too fast', 429);
    }
    list.push(now);
    this.recent.set(userId, list);
  }

  // ────────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────────

  /**
   * Newest page first by default: `before=<id>` pages back in time and
   * `nextCursor` is the id to pass next (null = start of the chat). `after=<id>`
   * returns what came after that id, oldest first - use it to catch up after
   * being offline. Messages inside a page are always oldest -> newest.
   */
  async list(
    userId: number,
    conversationId: number,
    opts: { before?: number; after?: number; limit?: number },
  ) {
    await this.conversations.requireAccess(conversationId, userId);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 30));

    if (opts.after) {
      const rows = await this.msgRepo
        .createQueryBuilder('m')
        .where('m.conversationId = :conversationId AND m.id > :after', {
          conversationId,
          after: opts.after,
        })
        .orderBy('m.id', 'ASC')
        .take(limit + 1)
        .getMany();
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      return {
        data: await this.views(page),
        nextCursor: null,
        hasMore,
        lastId: page.length ? page[page.length - 1].id : opts.after,
      };
    }

    const qb = this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.id', 'DESC')
      .take(limit + 1);
    if (opts.before) qb.andWhere('m.id < :before', { before: opts.before });
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();

    return {
      data: await this.views(page),
      nextCursor: hasMore ? page[0].id : null,
      hasMore,
    };
  }

  async remove(userId: number, messageId: number) {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');
    // someone removed from the page team can no longer touch the page's chats
    const { conv } = await this.conversations.requireAccess(msg.conversationId, userId);

    await this.msgRepo.update(msg.id, { deletedAt: new Date() });
    this.events.emitToUsers(await this.conversations.audience(conv), 'message:deleted', {
      conversationId: msg.conversationId,
      messageId: msg.id,
    });
    return { message: 'Message deleted' };
  }

  // ────────────────────────────────────────────────

  async views(messages: ConversationMessage[]) {
    const users = await this.conversations.usersById(messages.map((m) => m.senderId));
    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      messageType: m.messageType,
      content: m.deletedAt ? null : m.content,
      mediaUrl: m.deletedAt ? null : m.mediaUrl,
      clientMsgId: m.clientMsgId,
      deleted: !!m.deletedAt,
      createdAt: m.createdAt,
      sender: personView(users.get(m.senderId)),
    }));
  }
}
