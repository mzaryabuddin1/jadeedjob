import { ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import {
  ChatMongoConversation,
  ChatMongoMessage,
  ChatMongoReadState,
  ChatNotificationPayload,
  MongoMessagePage,
} from './chat-mongo.types';

export const CHAT_MONGO_STORE = Symbol('CHAT_MONGO_STORE');

type SendMongoMessageInput = {
  conversationId: string;
  jobApplicationId?: number | null;
  senderId: number;
  clientMessageId?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  attachments?: ChatMongoMessage['attachments'];
  messageType: string;
  notifications?: ChatNotificationPayload[];
};

export interface ChatMongoStorePort {
  readonly enabled: boolean;
  upsertConversation(conversation: ChatMongoConversation): Promise<void>;
  findConversation(id: string): Promise<ChatMongoConversation | null>;
  findConversationByApplication(
    applicationId: number,
  ): Promise<ChatMongoConversation | null>;
  findContextConversation(
    type: 'inquiry',
    jobId: number,
    participantUserIds: number[],
  ): Promise<ChatMongoConversation | null>;
  listConversations(
    userId: number,
    companyIds: number[],
    page: number,
    limit: number,
  ): Promise<{ data: ChatMongoConversation[]; total: number }>;
  sendMessage(input: SendMongoMessageInput): Promise<ChatMongoMessage>;
  mirrorSqlMessage(message: ChatMongoMessage): Promise<void>;
  getMessages(
    conversationId: string,
    beforeSequence: number | null,
    page: number,
    limit: number,
  ): Promise<MongoMessagePage>;
  getMessage(
    conversationId: string,
    messageId: string,
  ): Promise<ChatMongoMessage | null>;
  markRead(conversationId: string, userId: number): Promise<ChatMongoReadState>;
  mirrorReadState(state: ChatMongoReadState): Promise<void>;
  getReadState(
    conversationId: string,
    userId: number,
  ): Promise<ChatMongoReadState | null>;
  countUnread(
    conversationId: string,
    userId: number,
    afterSequence?: number | null,
  ): Promise<number>;
  updateConversation(
    conversationId: string,
    updates: Partial<ChatMongoConversation>,
  ): Promise<void>;
  setMessageModeration(
    messageId: string,
    status: 'visible' | 'hidden' | 'removed',
  ): Promise<boolean>;
  isPersistedAttachment(
    conversationId: string,
    fileUrl: string,
  ): Promise<boolean>;
  claimOutboxEvent(): Promise<Record<string, any> | null>;
  completeOutboxEvent(id: string): Promise<void>;
  retryOutboxEvent(id: string, errorCode: string): Promise<void>;
}

export class DisabledChatMongoStore implements ChatMongoStorePort {
  readonly enabled = false;

  private unavailable(): never {
    throw new ServiceUnavailableException({
      code: 'CHAT_MONGO_UNAVAILABLE',
      message: 'Mongo chat storage is not enabled',
    });
  }

  async upsertConversation(
    _conversation: ChatMongoConversation,
  ): Promise<void> {
    this.unavailable();
  }
  async findConversation(_id: string): Promise<ChatMongoConversation | null> {
    return this.unavailable();
  }
  async findConversationByApplication(
    _applicationId: number,
  ): Promise<ChatMongoConversation | null> {
    return this.unavailable();
  }
  async findContextConversation(
    _type: 'inquiry',
    _jobId: number,
    _participantUserIds: number[],
  ): Promise<ChatMongoConversation | null> {
    return this.unavailable();
  }
  async listConversations(
    _userId: number,
    _companyIds: number[],
    _page: number,
    _limit: number,
  ): Promise<{
    data: ChatMongoConversation[];
    total: number;
  }> {
    return this.unavailable();
  }
  async sendMessage(_input: SendMongoMessageInput): Promise<ChatMongoMessage> {
    return this.unavailable();
  }
  async mirrorSqlMessage(_message: ChatMongoMessage): Promise<void> {
    this.unavailable();
  }
  async getMessages(
    _conversationId: string,
    _beforeSequence: number | null,
    _page: number,
    _limit: number,
  ): Promise<MongoMessagePage> {
    return this.unavailable();
  }
  async getMessage(
    _conversationId: string,
    _messageId: string,
  ): Promise<ChatMongoMessage | null> {
    return this.unavailable();
  }
  async markRead(
    _conversationId: string,
    _userId: number,
  ): Promise<ChatMongoReadState> {
    return this.unavailable();
  }
  async mirrorReadState(_state: ChatMongoReadState): Promise<void> {
    this.unavailable();
  }
  async getReadState(
    _conversationId: string,
    _userId: number,
  ): Promise<ChatMongoReadState | null> {
    return this.unavailable();
  }
  async countUnread(
    _conversationId: string,
    _userId: number,
    _afterSequence?: number | null,
  ): Promise<number> {
    return this.unavailable();
  }
  async updateConversation(
    _conversationId: string,
    _updates: Partial<ChatMongoConversation>,
  ): Promise<void> {
    this.unavailable();
  }
  async setMessageModeration(
    _messageId: string,
    _status: 'visible' | 'hidden' | 'removed',
  ): Promise<boolean> {
    return this.unavailable();
  }
  async isPersistedAttachment(
    _conversationId: string,
    _fileUrl: string,
  ): Promise<boolean> {
    return this.unavailable();
  }
  async claimOutboxEvent(): Promise<Record<string, any> | null> {
    return this.unavailable();
  }
  async completeOutboxEvent(_id: string): Promise<void> {
    this.unavailable();
  }
  async retryOutboxEvent(_id: string, _errorCode: string): Promise<void> {
    this.unavailable();
  }
}

export class MongoChatStore implements ChatMongoStorePort {
  readonly enabled = true;

  constructor(
    private readonly conversationModel: Model<any>,
    private readonly participantModel: Model<any>,
    private readonly messageModel: Model<any>,
    private readonly readStateModel: Model<any>,
    private readonly outboxModel: Model<any>,
  ) {}

  async upsertConversation(conversation: ChatMongoConversation) {
    const participantUserIds = [
      ...new Set((conversation.participantUserIds || []).map(Number)),
    ];
    await this.conversationModel.updateOne(
      { _id: conversation.id },
      {
        $set: {
          type: conversation.type,
          jobId: conversation.jobId ?? null,
          applicationId: conversation.applicationId ?? null,
          createdByUserId: conversation.createdByUserId,
          companyId: conversation.companyId ?? null,
          participantUserIds,
          writeState: conversation.writeState,
          readOnlyReason: conversation.readOnlyReason ?? null,
          clientRequestId: conversation.clientRequestId ?? null,
          lastActivityAt: conversation.lastActivityAt ?? null,
          schemaVersion: 1,
        },
        $setOnInsert: {
          nextSequence: conversation.nextSequence || 0,
          messageCount: conversation.messageCount || 0,
        },
        ...(conversation.nextSequence
          ? { $max: { nextSequence: conversation.nextSequence } }
          : {}),
      },
      { upsert: true },
    );
    await this.participantModel.updateMany(
      {
        conversationId: conversation.id,
        ...(participantUserIds.length
          ? { userId: { $nin: participantUserIds } }
          : {}),
      },
      { $set: { active: false } },
    );
    if (participantUserIds.length) {
      await this.participantModel.bulkWrite(
        participantUserIds.map((userId) => ({
          updateOne: {
            filter: { conversationId: conversation.id, userId },
            update: { $set: { active: true } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }
  }

  async findConversation(id: string) {
    const row = await this.conversationModel.findById(id).lean().exec();
    return row ? this.mapConversation(row) : null;
  }

  async findConversationByApplication(applicationId: number) {
    const row = await this.conversationModel
      .findOne({ applicationId })
      .lean()
      .exec();
    return row ? this.mapConversation(row) : null;
  }

  async findContextConversation(
    type: 'inquiry',
    jobId: number,
    participantUserIds: number[],
  ) {
    const row = await this.conversationModel
      .findOne({
        type,
        jobId,
        participantUserIds: { $all: participantUserIds.map(Number) },
      })
      .lean()
      .exec();
    return row ? this.mapConversation(row) : null;
  }

  async listConversations(
    userId: number,
    companyIds: number[],
    page: number,
    limit: number,
  ) {
    const filter = {
      $or: [
        { participantUserIds: userId },
        ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
      ],
    };
    const [rows, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ lastActivityAt: -1, createdAt: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.conversationModel.countDocuments(filter).exec(),
    ]);
    return { data: rows.map((row) => this.mapConversation(row)), total };
  }

  async sendMessage(input: SendMongoMessageInput) {
    if (input.clientMessageId) {
      const existing = await this.messageModel
        .findOne({
          conversationId: input.conversationId,
          senderId: input.senderId,
          clientMessageId: input.clientMessageId,
        })
        .lean()
        .exec();
      if (existing) return this.withReadAt(this.mapMessage(existing));
    }

    const session = await this.conversationModel.db.startSession();
    let created: ChatMongoMessage;
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const conversation: any = await this.conversationModel
          .findOneAndUpdate(
            { _id: input.conversationId },
            { $inc: { nextSequence: 1, messageCount: 1 } },
            { new: true, session },
          )
          .lean()
          .exec();
        if (!conversation) {
          throw new ServiceUnavailableException(
            'Chat conversation is unavailable',
          );
        }
        const message: ChatMongoMessage = {
          id: randomUUID(),
          conversationId: input.conversationId,
          jobApplicationId: input.jobApplicationId ?? null,
          sequence: Number(conversation.nextSequence),
          clientMessageId: input.clientMessageId || null,
          senderId: input.senderId,
          content: input.content || null,
          mediaUrl: input.mediaUrl || null,
          attachments: input.attachments || [],
          messageType: input.messageType,
          moderationStatus: 'visible',
          createdAt: now,
          readAt: null,
        };
        await this.messageModel.create(
          [
            {
              ...message,
              _id: message.id,
              id: undefined,
              readAt: undefined,
            },
          ],
          { session },
        );
        await this.conversationModel.updateOne(
          { _id: input.conversationId },
          {
            $set: {
              lastActivityAt: now,
              latestMessage: message,
            },
          },
          { session },
        );
        const recipientIds = (conversation.participantUserIds || []).filter(
          (userId: number) => Number(userId) !== input.senderId,
        );
        for (const userId of recipientIds) {
          await this.readStateModel.updateOne(
            { conversationId: input.conversationId, userId },
            {
              $inc: { unreadCount: 1 },
              $setOnInsert: {
                lastReadMessageId: null,
                lastReadSequence: null,
                readAt: null,
              },
            },
            { upsert: true, session },
          );
        }
        for (const notification of input.notifications || []) {
          await this.outboxModel.updateOne(
            { eventKey: notification.dedupeKey },
            {
              $setOnInsert: {
                eventKey: notification.dedupeKey,
                type: 'notification',
                payload: notification,
                status: 'pending',
                availableAt: now,
                attempts: 0,
              },
            },
            { upsert: true, session },
          );
        }
        created = message;
      });
    } catch (error) {
      if ((error as any)?.code === 11000 && input.clientMessageId) {
        const existing = await this.messageModel
          .findOne({
            conversationId: input.conversationId,
            senderId: input.senderId,
            clientMessageId: input.clientMessageId,
          })
          .lean()
          .exec();
        if (existing) return this.withReadAt(this.mapMessage(existing));
      }
      throw error;
    } finally {
      await session.endSession();
    }
    return created;
  }

  async mirrorSqlMessage(message: ChatMongoMessage) {
    const session = await this.conversationModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await this.messageModel
          .findById(message.id)
          .session(session)
          .lean()
          .exec();
        if (existing) return;

        const conversation: any = await this.conversationModel
          .findOneAndUpdate(
            { _id: message.conversationId },
            {
              $inc: {
                nextSequence: 1,
                ...(message.moderationStatus === 'visible'
                  ? { messageCount: 1 }
                  : {}),
              },
            },
            { new: true, session },
          )
          .lean()
          .exec();
        if (!conversation) {
          throw new ServiceUnavailableException(
            'Chat conversation is unavailable',
          );
        }
        const mirrored = {
          ...message,
          sequence: Number(conversation.nextSequence),
        };
        await this.messageModel.create(
          [
            {
              ...mirrored,
              _id: mirrored.id,
              id: undefined,
              readAt: undefined,
            },
          ],
          { session },
        );
        if (mirrored.moderationStatus === 'visible') {
          await this.conversationModel.updateOne(
            { _id: message.conversationId },
            {
              $set: {
                latestMessage: { ...mirrored, readAt: undefined },
                lastActivityAt: mirrored.createdAt,
              },
            },
            { session },
          );
          for (const userId of conversation.participantUserIds || []) {
            if (Number(userId) === mirrored.senderId) continue;
            await this.readStateModel.updateOne(
              { conversationId: message.conversationId, userId },
              {
                $inc: { unreadCount: 1 },
                $setOnInsert: {
                  lastReadMessageId: null,
                  lastReadSequence: null,
                  readAt: null,
                },
              },
              { upsert: true, session },
            );
          }
        }
      });
    } catch (error) {
      if ((error as any)?.code === 11000) return;
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getMessages(
    conversationId: string,
    beforeSequence: number | null,
    page: number,
    limit: number,
  ): Promise<MongoMessagePage> {
    const filter: Record<string, any> = {
      conversationId,
      moderationStatus: 'visible',
    };
    if (beforeSequence) filter.sequence = { $lt: beforeSequence };
    const query = this.messageModel
      .find(filter)
      .sort({ sequence: -1 })
      .limit(limit + 1);
    if (!beforeSequence && page > 1) query.skip((page - 1) * limit);
    const [rows, total, readStates] = await Promise.all([
      query.lean().exec(),
      this.messageModel
        .countDocuments({ conversationId, moderationStatus: 'visible' })
        .exec(),
      this.readStateModel.find({ conversationId }).lean().exec(),
    ]);
    const hasMore = rows.length > limit;
    const pageRows = (hasMore ? rows.slice(0, limit) : rows).reverse();
    const messages = pageRows.map((row) => {
      const message = this.mapMessage(row);
      const receipt = readStates
        .filter(
          (state) =>
            Number(state.userId) !== message.senderId &&
            Number(state.lastReadSequence || 0) >= message.sequence,
        )
        .sort(
          (a, b) =>
            new Date(a.readAt || 0).getTime() -
            new Date(b.readAt || 0).getTime(),
        )[0];
      return { ...message, readAt: receipt?.readAt || null };
    });
    return {
      data: messages,
      nextBefore:
        hasMore && messages.length ? String(messages[0].sequence) : null,
      total,
    };
  }

  async getMessage(conversationId: string, messageId: string) {
    const row = await this.messageModel
      .findOne({ _id: messageId, conversationId })
      .lean()
      .exec();
    return row ? this.mapMessage(row) : null;
  }

  async markRead(conversationId: string, userId: number) {
    const latest: any = await this.messageModel
      .findOne({ conversationId, moderationStatus: 'visible' })
      .sort({ sequence: -1 })
      .lean()
      .exec();
    const now = new Date();
    const row: any = await this.readStateModel
      .findOneAndUpdate(
        { conversationId, userId },
        {
          $set: {
            lastReadMessageId: latest ? String(latest._id) : null,
            lastReadSequence: latest ? Number(latest.sequence) : null,
            readAt: now,
            unreadCount: 0,
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return this.mapReadState(row);
  }

  async mirrorReadState(state: ChatMongoReadState) {
    await this.readStateModel.updateOne(
      { conversationId: state.conversationId, userId: state.userId },
      { $set: state },
      { upsert: true },
    );
  }

  async getReadState(conversationId: string, userId: number) {
    const row = await this.readStateModel
      .findOne({ conversationId, userId })
      .lean()
      .exec();
    return row ? this.mapReadState(row) : null;
  }

  countUnread(
    conversationId: string,
    userId: number,
    afterSequence?: number | null,
  ) {
    return this.messageModel
      .countDocuments({
        conversationId,
        senderId: { $ne: userId },
        moderationStatus: 'visible',
        ...(afterSequence ? { sequence: { $gt: afterSequence } } : {}),
      })
      .exec();
  }

  async updateConversation(
    conversationId: string,
    updates: Partial<ChatMongoConversation>,
  ) {
    const values = { ...updates } as Record<string, unknown>;
    delete values.id;
    delete values.latestMessage;
    await this.conversationModel.updateOne(
      { _id: conversationId },
      { $set: values },
    );
  }

  async setMessageModeration(
    messageId: string,
    status: 'visible' | 'hidden' | 'removed',
  ) {
    const message: any = await this.messageModel
      .findById(messageId)
      .lean()
      .exec();
    if (!message) return false;
    if (message.moderationStatus === status) return true;
    await this.messageModel.updateOne(
      { _id: messageId },
      { $set: { moderationStatus: status } },
    );
    if ((message.moderationStatus || 'visible') === 'visible') {
      const latest: any = await this.messageModel
        .findOne({
          conversationId: message.conversationId,
          moderationStatus: 'visible',
        })
        .sort({ sequence: -1 })
        .lean()
        .exec();
      await this.conversationModel.updateOne(
        { _id: message.conversationId },
        {
          $inc: { messageCount: -1 },
          $set: {
            latestMessage: latest
              ? {
                  id: String(latest._id),
                  sequence: Number(latest.sequence),
                  senderId: Number(latest.senderId),
                  content: latest.content || null,
                  mediaUrl: latest.mediaUrl || null,
                  attachments: latest.attachments || [],
                  messageType: latest.messageType || 'text',
                  createdAt: latest.createdAt,
                }
              : null,
            lastActivityAt: latest?.createdAt || null,
          },
        },
      );
      await this.readStateModel.updateMany(
        {
          conversationId: message.conversationId,
          userId: { $ne: Number(message.senderId) },
          unreadCount: { $gt: 0 },
          $or: [
            { lastReadSequence: null },
            { lastReadSequence: { $lt: Number(message.sequence) } },
          ],
        },
        { $inc: { unreadCount: -1 } },
      );
    }
    return true;
  }

  async isPersistedAttachment(conversationId: string, fileUrl: string) {
    return Boolean(
      await this.messageModel.exists({
        conversationId,
        $or: [{ mediaUrl: fileUrl }, { 'attachments.fileUrl': fileUrl }],
      }),
    );
  }

  async claimOutboxEvent() {
    const now = new Date();
    const row: any = await this.outboxModel
      .findOneAndUpdate(
        {
          availableAt: { $lte: now },
          $or: [
            { status: 'pending' },
            { status: 'processing', leaseExpiresAt: { $lte: now } },
          ],
        },
        {
          $set: {
            status: 'processing',
            leaseExpiresAt: new Date(now.getTime() + 60_000),
          },
          $inc: { attempts: 1 },
        },
        { sort: { availableAt: 1, _id: 1 }, new: true },
      )
      .lean()
      .exec();
    return row ? { ...row, id: String(row._id) } : null;
  }

  async completeOutboxEvent(id: string) {
    await this.outboxModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          leaseExpiresAt: null,
          lastErrorCode: null,
        },
      },
    );
  }

  async retryOutboxEvent(id: string, errorCode: string) {
    await this.outboxModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'pending',
          availableAt: new Date(Date.now() + 30_000),
          leaseExpiresAt: null,
          lastErrorCode: String(errorCode || 'OUTBOX_DELIVERY_FAILED').slice(
            0,
            120,
          ),
        },
      },
    );
  }

  private mapConversation(row: any): ChatMongoConversation {
    return {
      id: String(row._id),
      type: row.type,
      jobId: row.jobId ?? null,
      applicationId: row.applicationId ?? null,
      createdByUserId: Number(row.createdByUserId),
      companyId: row.companyId ?? null,
      participantUserIds: (row.participantUserIds || []).map(Number),
      writeState: row.writeState || 'active',
      readOnlyReason: row.readOnlyReason ?? null,
      clientRequestId: row.clientRequestId ?? null,
      lastActivityAt: row.lastActivityAt || null,
      nextSequence: Number(row.nextSequence || 0),
      messageCount: Number(row.messageCount || 0),
      latestMessage: row.latestMessage
        ? this.mapMessage({
            ...row.latestMessage,
            _id: row.latestMessage.id,
            conversationId: String(row._id),
          })
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapMessage(row: any): ChatMongoMessage {
    return {
      id: String(row._id || row.id),
      conversationId: String(row.conversationId),
      jobApplicationId: row.jobApplicationId ?? null,
      legacySqlId: row.legacySqlId ?? null,
      sequence: Number(row.sequence),
      clientMessageId: row.clientMessageId || null,
      senderId: Number(row.senderId),
      content: row.content || null,
      mediaUrl: row.mediaUrl || null,
      attachments: row.attachments || [],
      messageType: row.messageType || 'text',
      moderationStatus: row.moderationStatus || 'visible',
      createdAt: new Date(row.createdAt),
      readAt: row.readAt || null,
    };
  }

  private mapReadState(row: any): ChatMongoReadState {
    return {
      conversationId: String(row.conversationId),
      userId: Number(row.userId),
      lastReadMessageId: row.lastReadMessageId || null,
      lastReadSequence:
        row.lastReadSequence === null || row.lastReadSequence === undefined
          ? null
          : Number(row.lastReadSequence),
      readAt: row.readAt || null,
      unreadCount: Number(row.unreadCount || 0),
    };
  }

  private async withReadAt(message: ChatMongoMessage) {
    const states = await this.readStateModel
      .find({
        conversationId: message.conversationId,
        userId: { $ne: message.senderId },
        lastReadSequence: { $gte: message.sequence },
      })
      .sort({ readAt: 1 })
      .limit(1)
      .lean()
      .exec();
    return { ...message, readAt: states[0]?.readAt || null };
  }
}
