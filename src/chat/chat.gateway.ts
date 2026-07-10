// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { AuthSessionService } from 'src/auth/auth-session.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        (client.handshake.auth && client.handshake.auth.token) ||
        (client.handshake.headers['authorization'] as string) ||
        '';

      const token = rawToken.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('No token');

      const payload = await this.authSessionService.validateToken(token);

      (client as any).userId = payload.id;
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Optional: logging, online status, etc.
  }

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

    const message = await this.chatService.sendMessage(userId, dto);

    const room = `application_${dto.jobApplicationId}`;
    this.server.to(room).emit('newMessage', message);

    return message;
  }
}
