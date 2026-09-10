import { DisabledChatMongoStore, MongoChatStore } from './chat-mongo.store';

const queryResult = (value: any) => ({
  lean: () => ({ exec: async () => value }),
});

describe('MongoChatStore', () => {
  it('fails closed when Mongo chat storage is disabled', async () => {
    const store = new DisabledChatMongoStore();
    await expect(store.findConversation('chat-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CHAT_MONGO_UNAVAILABLE' }),
    });
  });

  it('updates moderation state and repairs the latest-message projection', async () => {
    const conversationModel = { updateOne: jest.fn(async () => ({})) };
    const messageModel = {
      findById: jest.fn(() =>
        queryResult({
          _id: 'message-2',
          conversationId: 'chat-1',
          moderationStatus: 'visible',
        }),
      ),
      updateOne: jest.fn(async () => ({})),
      findOne: jest.fn(() => ({
        sort: () =>
          queryResult({
            _id: 'message-1',
            conversationId: 'chat-1',
            sequence: 1,
            senderId: 7,
            content: 'Earlier message',
            attachments: [],
            messageType: 'text',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          }),
      })),
    };
    const store = new MongoChatStore(
      conversationModel as any,
      {} as any,
      messageModel as any,
      { updateMany: jest.fn(async () => ({})) } as any,
      {} as any,
    );

    await expect(
      store.setMessageModeration('message-2', 'hidden'),
    ).resolves.toBe(true);
    expect(messageModel.updateOne).toHaveBeenCalledWith(
      { _id: 'message-2' },
      { $set: { moderationStatus: 'hidden' } },
    );
    expect(conversationModel.updateOne).toHaveBeenCalledWith(
      { _id: 'chat-1' },
      expect.objectContaining({
        $inc: { messageCount: -1 },
        $set: expect.objectContaining({
          latestMessage: expect.objectContaining({ id: 'message-1' }),
        }),
      }),
    );
  });

  it('allocates a sequence and persists message, unread, and outbox changes in one transaction', async () => {
    const session = {
      withTransaction: jest.fn(async (work) => work()),
      endSession: jest.fn(async () => undefined),
    };
    const conversationModel = {
      db: { startSession: jest.fn(async () => session) },
      findOneAndUpdate: jest.fn(() =>
        queryResult({
          _id: 'chat-1',
          nextSequence: 4,
          participantUserIds: [7, 8],
        }),
      ),
      updateOne: jest.fn(async () => ({})),
    };
    const messageModel = {
      findOne: jest.fn(() => queryResult(null)),
      create: jest.fn(async () => []),
    };
    const readStateModel = { updateOne: jest.fn(async () => ({})) };
    const outboxModel = { updateOne: jest.fn(async () => ({})) };
    const store = new MongoChatStore(
      conversationModel as any,
      {} as any,
      messageModel as any,
      readStateModel as any,
      outboxModel as any,
    );

    const result = await store.sendMessage({
      conversationId: 'chat-1',
      senderId: 7,
      clientMessageId: 'client-1',
      content: 'Hello',
      attachments: [],
      messageType: 'text',
      notifications: [
        {
          userId: 8,
          type: 'chat_message',
          title: 'New message',
          message: 'Hello',
          data: { chatId: 'chat-1' },
          dedupeKey: 'chat_message:client-1:chat-1:user:8',
        },
      ],
    });

    expect(result).toMatchObject({
      conversationId: 'chat-1',
      sequence: 4,
      senderId: 7,
      clientMessageId: 'client-1',
    });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(messageModel.create).toHaveBeenCalledWith(
      [expect.objectContaining({ _id: result.id, sequence: 4 })],
      { session },
    );
    expect(readStateModel.updateOne).toHaveBeenCalledTimes(1);
    expect(outboxModel.updateOne).toHaveBeenCalledWith(
      { eventKey: 'chat_message:client-1:chat-1:user:8' },
      expect.any(Object),
      { upsert: true, session },
    );
  });
});
