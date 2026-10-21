import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatEvents } from './chat-events.service';
import { ConversationsService } from './conversations.service';
import { MessagesService, SendDto } from './messages.service';

type Ack<T> = { ok: true } & T | { ok: false; error: string; status: number };

/**
 * Socket namespace `chat`. Auth: `auth: { token }` (or an Authorization header).
 *
 * Every socket joins the personal room `user:{id}`; events for the inbox
 * arrive there with no room management:
 *   message:new {conversationId, message}   message:deleted {conversationId, messageId}
 *   conversation:read {conversationId, userId, lastReadMessageId}
 *   typing {conversationId, userId, isTyping}
 *
 * Client -> server (each answers with an ack `{ok:true,...}` / `{ok:false,error}`):
 *   conversation:send {conversationId, content?, mediaUrl?, messageType?, clientMsgId?}
 *   conversation:typing {conversationId, isTyping}
 *   conversation:read {conversationId, messageId?}
 *
 * Legacy (application chat, unchanged): joinApplication / sendMessage -> newMessage.
 */
@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*' },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** `${userId}:${conversationId}` -> last typing broadcast (ms) */
  private readonly typingAt = new Map<string, number>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly events: ChatEvents,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  afterInit(server: Server) {
    this.events.attach(server);
  }

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        (client.handshake.auth && client.handshake.auth.token) ||
        (client.handshake.headers['authorization'] as string) ||
        '';

      const token = rawToken.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      (client as any).userId = payload.id;
      await client.join(`user:${payload.id}`);
      this.events.connected(payload.id);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) this.events.disconnected(userId);
  }

  // ───────── new: conversations ─────────

  @SubscribeMessage('conversation:send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendDto & { conversationId: number },
  ): Promise<Ack<{ message: unknown }>> {
    return this.safe(client, async (userId) => ({
      message: await this.messages.send(userId, Number(body?.conversationId), body ?? {}),
    }));
  }

  @SubscribeMessage('conversation:typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number; isTyping?: boolean },
  ): Promise<Ack<object>> {
    return this.safe(client, async (userId) => {
      const conversationId = Number(body?.conversationId);
      const isTyping = body?.isTyping !== false;
      // at most one "typing" broadcast per second per person and chat
      const k = `${userId}:${conversationId}`;
      const now = Date.now();
      if (isTyping && now - (this.typingAt.get(k) ?? 0) < 1000) return {};
      this.typingAt.set(k, now);
      if (this.typingAt.size > 5000) this.typingAt.clear();

      const { conv } = await this.conversations.requireAccess(conversationId, userId);
      const others = (await this.conversations.audience(conv)).filter((id) => id !== userId);
      this.events.emitToUsers(others, 'typing', { conversationId, userId, isTyping });
      return {};
    });
  }

  @SubscribeMessage('conversation:read')
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number; messageId?: number },
  ): Promise<Ack<object>> {
    return this.safe(client, async (userId) =>
      this.conversations.markRead(userId, Number(body?.conversationId), body?.messageId ? Number(body.messageId) : undefined),
    );
  }

  /** turns service errors into an ack the app can show (instead of a silent drop) */
  private async safe<T extends object>(
    client: Socket,
    fn: (userId: number) => Promise<T>,
  ): Promise<Ack<T>> {
    const userId = (client as any).userId;
    if (!userId) return { ok: false, error: 'Unauthorized', status: 401 };
    try {
      return { ok: true, ...(await fn(userId)) };
    } catch (err) {
      if (err instanceof HttpException) {
        return { ok: false, error: err.message, status: err.getStatus() };
      }
      return { ok: false, error: 'Something went wrong', status: 500 };
    }
  }

  // ───────── legacy: chat per job application ─────────

  @SubscribeMessage('joinApplication')
  async joinApplication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobApplicationId: number },
  ) {
    const userId = (client as any).userId;
    if (!userId) throw new WsException('Unauthorized');

    const canAccess = await this.chatService.userCanAccessApplication(
      userId,
      data.jobApplicationId,
    );

    if (!canAccess) throw new WsException('Forbidden');

    const room = `application_${data.jobApplicationId}`;
    client.join(room);

    return { joined: true, room };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = (client as any).userId;
    if (!userId) throw new WsException('Unauthorized');

    let message;
    try {
      message = await this.chatService.sendMessage(userId, dto);
    } catch (err) {
      if (err instanceof HttpException) throw new WsException(err.message);
      throw err;
    }

    const room = `application_${dto.jobApplicationId}`;
    this.server.to(room).emit('newMessage', message);

    return message;
  }
}
