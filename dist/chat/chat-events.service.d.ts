import type { Server } from 'socket.io';
export declare class ChatEvents {
    private server;
    private readonly online;
    attach(server: Server): void;
    connected(userId: number): void;
    disconnected(userId: number): void;
    isOnline(userId: number): boolean;
    emitToUsers(userIds: number[], event: string, payload: unknown): void;
}
