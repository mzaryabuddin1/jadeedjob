import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RealtimePresenceService } from 'src/realtime/realtime-presence.service';

const socketOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

type Ack =
  | { ok: true; data: unknown }
  | {
      ok: false;
      error: { code: string; message: string; details?: unknown };
    };

@WebSocketGateway({
  namespace: '/chat',
  path: process.env.SOCKET_PATH || '/socket.io',
  cors: {
    origin:
      socketOrigins.length > 0
        ? socketOrigins
        : process.env.NODE_ENV === 'production'
          ? false
          : true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly authSessionService: AuthSessionService,
    private readonly presenceService: RealtimePresenceService,
  ) {}

  private readonly eventRateLimits = new Map<
    string,
    { count: number; resetAt: number }
  >();

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization as string) ||
        '';
      const token = rawToken.replace(/^Bearer\s+/i, '').trim();
      if (!token) throw new Error('No token');
      const payload = await this.authSessionService.validateToken(token);
      client.data.accessToken = token;
      client.data.userId = payload.id;
      await client.join(this.userRoom(payload.id));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.presenceService.clearSocket(client.id).catch(() => undefined);
    for (const key of this.eventRateLimits.keys()) {
      if (key.startsWith(`${client.id}:`)) {
        this.eventRateLimits.delete(key);
      }
    }
  }

  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string; conversationId?: string },
  ): Promise<Ack> {
    return this.ack(async (userId) => {
      const reference = body?.conversationId || body?.chatId;
      const conversation = await this.chatService.assertCanJoinConversation(
        userId,
        reference,
      );
      await client.join(this.chatRoom(conversation.id));
      await this.presenceService.markActive(userId, conversation.id, client.id);
      return {
        chatId: conversation.id,
        conversationId: conversation.id,
        joined: true,
      };
    }, client);
  }

  @SubscribeMessage('chat:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string; conversationId?: string },
  ): Promise<Ack> {
    return this.ack(async (userId) => {
      const reference = body?.conversationId || body?.chatId;
      const conversation = await this.chatService.assertCanJoinConversation(
        userId,
        reference,
      );
      await client.leave(this.chatRoom(conversation.id));
      await this.presenceService.markInactive(
        userId,
        conversation.id,
        client.id,
      );
      return {
        chatId: conversation.id,
        conversationId: conversation.id,
        left: true,
      };
    }, client);
  }

  @SubscribeMessage('chat:message.send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      chatId?: string;
      conversationId?: string;
      clientMessageId?: string;
      text?: string;
      content?: string;
      mediaUrl?: string;
      messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
      attachments?: Array<{
        fileUrl: string;
        fileName?: string;
        contentType?: string;
      }>;
    },
  ): Promise<Ack> {
    return this.ack(async (userId) => {
      this.enforceEventRateLimit(client, 'chat:message.send', 30, 10_000);
      const reference = body?.conversationId || body?.chatId;
      const message = await this.chatService.sendMessage(userId, {
        conversationId: reference,
        clientMessageId: body?.clientMessageId,
        content: body?.content ?? body?.text,
        mediaUrl: body?.mediaUrl,
        messageType: body?.messageType,
        attachments: body?.attachments,
      });
      this.server
        .to(this.chatRoom(message.conversationId))
        .emit('chat:message.created', message);
      await this.emitInboxUpdates(message.conversationId);
      return message;
    }, client);
  }

  @SubscribeMessage('chat:read')
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string; conversationId?: string },
  ): Promise<Ack> {
    return this.ack(async (userId) => {
      const reference = body?.conversationId || body?.chatId;
      const state = await this.chatService.markRead(reference, userId);
      this.server
        .to(this.chatRoom(state.conversationId))
        .emit('chat:read.updated', { ...state, userId });
      await this.emitInboxUpdates(state.conversationId);
      return state;
    }, client);
  }

  @SubscribeMessage('chat:typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      chatId?: string;
      conversationId?: string;
      typing: boolean;
    },
  ): Promise<Ack> {
    return this.ack(async (userId) => {
      this.enforceEventRateLimit(client, 'chat:typing', 30, 10_000);
      const reference = body?.conversationId || body?.chatId;
      await this.chatService.canWriteConversation(userId, reference);
      const audience = await this.chatService.realtimeAudienceIds(reference);
      const update = {
        chatId: audience.conversationId,
        conversationId: audience.conversationId,
        userId,
        typing: Boolean(body?.typing),
      };
      client
        .to(this.chatRoom(audience.conversationId))
        .emit('chat:typing.updated', update);
      return update;
    }, client);
  }

  @SubscribeMessage('joinApplication')
  async joinApplication(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { jobApplicationId: number },
  ) {
    const result = await this.join(client, {
      conversationId: String(body?.jobApplicationId || ''),
    });
    if (result.ok) {
      await client.join(`application_${body.jobApplicationId}`);
      return { joined: true, room: `application_${body.jobApplicationId}` };
    }
    return result;
  }

  @SubscribeMessage('sendMessage')
  async sendLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const result = await this.ack(async (userId) => {
      this.enforceEventRateLimit(client, 'sendMessage', 30, 10_000);
      const message = await this.chatService.sendMessage(userId, dto);
      this.server
        .to(`application_${dto.jobApplicationId}`)
        .emit('newMessage', message);
      this.server
        .to(this.chatRoom(message.conversationId))
        .emit('chat:message.created', message);
      await this.emitInboxUpdates(message.conversationId);
      return message;
    }, client);
    return result.ok ? result.data : result;
  }

  emitInvitationUpdated(conversationId: string, data: unknown) {
    this.server
      ?.to(this.chatRoom(conversationId))
      .emit('chat:invitation.updated', data);
  }

  private async ack(
    operation: (userId: number) => Promise<unknown>,
    client: Socket,
  ): Promise<Ack> {
    try {
      const userId = await this.authenticatedUserId(client);
      return { ok: true, data: await operation(userId) };
    } catch (error) {
      return { ok: false, error: this.socketError(error) };
    }
  }

  private async authenticatedUserId(client: Socket) {
    const handshakeToken = String(
      client.handshake.auth?.token ||
        client.handshake.headers.authorization ||
        '',
    )
      .replace(/^Bearer\s+/i, '')
      .trim();
    const token = String(client.data.accessToken || handshakeToken);
    if (!token) throw new Error('Unauthorized');
    const payload = await this.authSessionService.validateToken(token);
    client.data.accessToken = token;
    client.data.userId = payload.id;
    return payload.id;
  }

  private async emitInboxUpdates(reference: string) {
    const audience = await this.chatService.realtimeAudienceIds(reference);
    for (const userId of audience.userIds) {
      this.server.to(this.userRoom(userId)).emit('chat:inbox.updated', {
        chatId: audience.conversationId,
        conversationId: audience.conversationId,
      });
    }
  }

  private socketError(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse() as any;
      return {
        code:
          response?.code ||
          (error.getStatus() === 401
            ? 'AUTH_SESSION_INVALID'
            : error.getStatus() === 403
              ? 'CHAT_FORBIDDEN'
              : 'CHAT_REQUEST_FAILED'),
        message:
          response?.message ||
          (typeof response === 'string' ? response : error.message),
        ...(response?.details === undefined
          ? {}
          : { details: response.details }),
      };
    }
    return {
      code: 'CHAT_REQUEST_FAILED',
      message: error instanceof Error ? error.message : 'Chat request failed',
    };
  }

  private chatRoom(conversationId: string) {
    return `chat:${conversationId}`;
  }

  private userRoom(userId: number) {
    return `user:${userId}`;
  }

  private enforceEventRateLimit(
    client: Socket,
    event: string,
    limit: number,
    windowMs: number,
  ) {
    const now = Date.now();
    const key = `${client.id}:${event}`;
    const current = this.eventRateLimits.get(key);
    if (!current || current.resetAt <= now) {
      this.eventRateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (current.count >= limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many ${event} events`,
        },
        429,
      );
    }
    current.count += 1;
  }
}
