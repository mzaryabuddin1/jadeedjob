import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
export declare class ChatMigration implements OnApplicationBootstrap {
    private readonly legacyRepo;
    private readonly convRepo;
    private readonly memberRepo;
    private readonly msgRepo;
    private readonly appRepo;
    private readonly logger;
    constructor(legacyRepo: Repository<ChatMessage>, convRepo: Repository<Conversation>, memberRepo: Repository<ConversationMember>, msgRepo: Repository<ConversationMessage>, appRepo: Repository<JobApplication>);
    onApplicationBootstrap(): void;
    run(): Promise<void>;
    private migrateApplication;
}
