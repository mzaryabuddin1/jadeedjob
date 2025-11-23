import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Server, Socket } from 'socket.io';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly jwtService;
    server: Server;
    constructor(chatService: ChatService, jwtService: JwtService);
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
