import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Follow, FollowTargetType } from './follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationService } from 'src/notification/notification.service';
export declare class FollowNotifier implements OnModuleInit {
    private readonly queue;
    private readonly notifications;
    private readonly followRepo;
    private readonly userRepo;
    private readonly pageRepo;
    private readonly logger;
    constructor(queue: NotificationQueueService, notifications: NotificationService, followRepo: Repository<Follow>, userRepo: Repository<User>, pageRepo: Repository<Page>);
    onModuleInit(): void;
    onFollow(actorId: number, type: FollowTargetType, targetId: number): Promise<void>;
    private flush;
}
