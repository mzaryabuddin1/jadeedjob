import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostComment, PostLike } from './entities/post-engagement.entities';
import { User } from 'src/users/entities/user.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationService } from 'src/notification/notification.service';
export declare class PostEngagementNotifier implements OnModuleInit {
    private readonly queue;
    private readonly notifications;
    private readonly postRepo;
    private readonly likeRepo;
    private readonly commentRepo;
    private readonly userRepo;
    private readonly logger;
    constructor(queue: NotificationQueueService, notifications: NotificationService, postRepo: Repository<Post>, likeRepo: Repository<PostLike>, commentRepo: Repository<PostComment>, userRepo: Repository<User>);
    onModuleInit(): void;
    private path;
    onLike(post: Post, actorId: number): Promise<void>;
    onComment(post: Post, actorId: number, comment: PostComment, parent: PostComment | null): Promise<void>;
    private safeEnqueue;
    private names;
    private flushLikes;
    private flushComments;
}
