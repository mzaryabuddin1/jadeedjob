import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatEvents } from './chat-events.service';
import { ConversationsService } from './conversations.service';
import { MessagesService, SendDto } from './messages.service';
type Ack<T> = {
    ok: true;
} & T | {
    ok: false;
    error: string;
    status: number;
};
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly jwtService;
    private readonly events;
    private readonly conversations;
    private readonly messages;
    server: Server;
    private readonly typingAt;
    constructor(chatService: ChatService, jwtService: JwtService, events: ChatEvents, conversations: ConversationsService, messages: MessagesService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    send(client: Socket, body: SendDto & {
        conversationId: number;
    }): Promise<Ack<{
        message: unknown;
    }>>;
    typing(client: Socket, body: {
        conversationId: number;
        isTyping?: boolean;
    }): Promise<Ack<object>>;
    read(client: Socket, body: {
        conversationId: number;
        messageId?: number;
    }): Promise<Ack<object>>;
    private safe;
    joinApplication(client: Socket, data: {
        jobApplicationId: number;
    }): Promise<{
        joined: boolean;
        room: string;
    }>;
    sendMessage(client: Socket, dto: SendMessageDto): Promise<any>;
}
export {};
