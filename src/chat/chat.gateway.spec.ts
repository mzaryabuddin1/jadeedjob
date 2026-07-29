import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  it('authenticates an immediate event from the handshake token', async () => {
    const chatService = {
      canWriteConversation: jest.fn().mockResolvedValue(true),
      realtimeAudienceIds: jest.fn().mockResolvedValue({
        conversationId: '9d3af048-1e92-4cea-b163-a604a3f02f76',
        userIds: [1],
      }),
    };
    const authSessionService = {
      validateToken: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const gateway = new ChatGateway(
      chatService as any,
      authSessionService as any,
      { clearSocket: jest.fn() } as any,
    );
    const emit = jest.fn();
    const client = {
      id: 'socket-1',
      data: {},
      handshake: {
        auth: { token: 'valid-access-token' },
        headers: {},
      },
      to: jest.fn().mockReturnValue({ emit }),
    } as any;

    const result = await gateway.typing(client, {
      conversationId: '9d3af048-1e92-4cea-b163-a604a3f02f76',
      typing: true,
    });

    expect(result).toMatchObject({ ok: true });
    expect(authSessionService.validateToken).toHaveBeenCalledWith(
      'valid-access-token',
    );
    expect(client.data.accessToken).toBe('valid-access-token');
    expect(emit).toHaveBeenCalledWith(
      'chat:typing.updated',
      expect.objectContaining({ userId: 1, typing: true }),
    );
  });
});
