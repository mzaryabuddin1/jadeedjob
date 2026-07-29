import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
export declare class RealtimePresenceService implements OnModuleInit, OnApplicationShutdown {
    private readonly instanceId;
    private readonly local;
    private readonly socketKeys;
    private redis;
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
    markActive(userId: number, conversationId: string, socketId: string): Promise<void>;
    markInactive(userId: number, conversationId: string, socketId: string): Promise<void>;
    clearSocket(socketId: string): Promise<void>;
    isActive(userId: number, conversationId: string): Promise<boolean>;
    private removeSocketFromKey;
    private key;
}
