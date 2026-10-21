import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationService } from 'src/notification/notification.service';
import { ConversationsService } from './conversations.service';
export declare class ChatNotifier implements OnModuleInit {
    private readonly queue;
    private readonly notifications;
    private readonly conversations;
    private readonly memberRepo;
    private readonly msgRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly logger;
    constructor(queue: NotificationQueueService, notifications: NotificationService, conversations: ConversationsService, memberRepo: Repository<ConversationMember>, msgRepo: Repository<ConversationMessage>, jobRepo: Repository<Job>, userRepo: Repository<User>);
    onModuleInit(): void;
    onMessage(conv: Conversation, msg: ConversationMessage, memberIds: number[]): Promise<void>;
    private flush;
}
