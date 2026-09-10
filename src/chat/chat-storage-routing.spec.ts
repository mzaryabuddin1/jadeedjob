import { ChatService } from './chat.service';

describe('ChatService Mongo routing', () => {
  const originalMode = process.env.CHAT_STORAGE_MODE;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.CHAT_STORAGE_MODE;
    else process.env.CHAT_STORAGE_MODE = originalMode;
  });

  it('reads message history from Mongo without querying SQL messages', async () => {
    process.env.CHAT_STORAGE_MODE = 'mongo';
    const messageRepo = {
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };
    const user = {
      id: 7,
      firstName: 'Demo',
      lastName: 'User',
      profile_photo: null,
    };
    const mongoStore = {
      enabled: true,
      findConversation: jest.fn(async () => ({
        id: 'chat-1',
        type: 'inquiry',
        jobId: null,
        applicationId: null,
        createdByUserId: 7,
        companyId: null,
        participantUserIds: [7],
        writeState: 'active',
        readOnlyReason: null,
      })),
      getMessages: jest.fn(async () => ({
        data: [
          {
            id: 'mongo-message-1',
            conversationId: 'chat-1',
            jobApplicationId: null,
            sequence: 4,
            clientMessageId: 'client-1',
            senderId: 7,
            content: 'Hello',
            mediaUrl: null,
            attachments: [],
            messageType: 'text',
            moderationStatus: 'visible',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
        nextBefore: null,
        total: 1,
      })),
    };
    const service = new ChatService(
      messageRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findOne: jest.fn(async () => null) } as any,
      {
        find: jest.fn(async () => [user]),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { getUrl: jest.fn() } as any,
      mongoStore as any,
      {} as any,
    );

    const result = await service.getMessages('chat-1', 7, 1, 20);

    expect(result.data[0]).toMatchObject({
      id: 'mongo-message-1',
      sequence: 4,
      text: 'Hello',
    });
    expect(mongoStore.getMessages).toHaveBeenCalledWith('chat-1', null, 1, 20);
    expect(messageRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(messageRepo.count).not.toHaveBeenCalled();
  });

  it('writes messages and notification work only through Mongo in mongo mode', async () => {
    process.env.CHAT_STORAGE_MODE = 'mongo';
    const messageRepo = { save: jest.fn(), create: jest.fn() };
    const user = {
      id: 7,
      firstName: 'Demo',
      lastName: 'User',
      profile_photo: null,
    };
    const mongoStore = {
      enabled: true,
      findConversation: jest.fn(async () => ({
        id: 'chat-1',
        type: 'inquiry',
        jobId: null,
        applicationId: null,
        createdByUserId: 7,
        companyId: null,
        participantUserIds: [7],
        writeState: 'active',
        readOnlyReason: null,
      })),
      sendMessage: jest.fn(async (input) => ({
        id: 'mongo-message-1',
        conversationId: input.conversationId,
        jobApplicationId: null,
        sequence: 1,
        clientMessageId: input.clientMessageId,
        senderId: input.senderId,
        content: input.content,
        mediaUrl: null,
        attachments: [],
        messageType: 'text',
        moderationStatus: 'visible',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })),
    };
    const service = new ChatService(
      messageRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findOne: jest.fn(async () => null) } as any,
      {
        find: jest.fn(async () => [user]),
        findOne: jest.fn(async () => user),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findKnownAssetByUrl: jest.fn() } as any,
      mongoStore as any,
      {} as any,
    );

    const result = await service.sendMessage(7, {
      conversationId: 'chat-1',
      content: 'Mongo only',
      clientMessageId: 'client-1',
    });

    expect(result).toMatchObject({
      id: 'mongo-message-1',
      sequence: 1,
      text: 'Mongo only',
    });
    expect(mongoStore.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'chat-1',
        clientMessageId: 'client-1',
      }),
    );
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(messageRepo.save).not.toHaveBeenCalled();
  });
});
