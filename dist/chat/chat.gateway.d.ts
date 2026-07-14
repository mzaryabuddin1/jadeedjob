import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Server, Socket } from 'socket.io';
import { AuthSessionService } from 'src/auth/auth-session.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly authSessionService;
    server: Server;
    constructor(chatService: ChatService, authSessionService: AuthSessionService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    joinApplication(client: Socket, data: {
        jobApplicationId: number;
    }): Promise<{
        joined: boolean;
        room: string;
    }>;
    sendMessage(client: Socket, dto: SendMessageDto): Promise<{
        id: number;
        chatId: number;
        jobApplicationId: number;
        senderId: number;
        senderName: string;
        senderAvatar: string;
        text: string;
        attachments: {
            fileUrl: string;
            fileName?: string;
            contentType?: string;
        }[];
        messageType: string;
        createdAt: Date;
        readAt: Date;
    }>;
}
