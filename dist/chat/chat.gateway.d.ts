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
    sendMessage(client: Socket, dto: SendMessageDto): Promise<import("./entities/chat-message.entity").ChatMessage>;
}
