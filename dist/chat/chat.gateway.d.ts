import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RealtimePresenceService } from 'src/realtime/realtime-presence.service';
type Ack = {
    ok: true;
    data: unknown;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly authSessionService;
    private readonly presenceService;
    server: Server;
    constructor(chatService: ChatService, authSessionService: AuthSessionService, presenceService: RealtimePresenceService);
    private readonly eventRateLimits;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    join(client: Socket, body: {
        chatId?: string;
        conversationId?: string;
    }): Promise<Ack>;
    leave(client: Socket, body: {
        chatId?: string;
        conversationId?: string;
    }): Promise<Ack>;
    send(client: Socket, body: {
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
    }): Promise<Ack>;
    read(client: Socket, body: {
        chatId?: string;
        conversationId?: string;
    }): Promise<Ack>;
    typing(client: Socket, body: {
        chatId?: string;
        conversationId?: string;
        typing: boolean;
    }): Promise<Ack>;
    joinApplication(client: Socket, body: {
        jobApplicationId: number;
    }): Promise<{
        ok: true;
        data: unknown;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
            details?: unknown;
        };
    } | {
        joined: boolean;
        room: string;
    }>;
    sendLegacy(client: Socket, dto: SendMessageDto): Promise<unknown>;
    emitInvitationUpdated(conversationId: string, data: unknown): void;
    private ack;
    private authenticatedUserId;
    private emitInboxUpdates;
    private socketError;
    private chatRoom;
    private userRoom;
    private enforceEventRateLimit;
}
export {};
