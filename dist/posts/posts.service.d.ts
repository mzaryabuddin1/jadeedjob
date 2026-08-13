import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { PagesService } from 'src/pages/pages.service';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { User } from 'src/users/entities/user.entity';
import { CommunityPost, PostPublisherType } from './entities/community-post.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostLike } from './entities/post-like.entity';
import { PostReport } from './entities/post-report.entity';
import { PostSave } from './entities/post-save.entity';
import { PostStorageService } from './post-storage.service';
import { PostVideoUploadSession } from './entities/post-video-upload-session.entity';
import { PostVideoStorageService } from './post-video-storage.service';
import { ModerationService } from 'src/moderation/moderation.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { NotificationsService } from 'src/notifications/notifications.service';
type PostFeedQuery = {
    feed?: 'forYou' | 'mine';
    cursor?: string;
    limit?: number;
    publisherType?: PostPublisherType;
    publisherId?: number;
};
type PostSearchQuery = {
    q: string;
    page?: number;
    limit?: number;
};
type PostMutationBody = {
    publisherType?: PostPublisherType;
    publisherId?: number | string;
    body?: string | null;
    linkedJobId?: number | string | null;
    allowComments?: boolean | string;
    removeImage?: boolean | string;
    removeMedia?: boolean | string;
};
type PostVideoMediaInput = {
    fileName: string;
    contentType: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
};
type CreateVideoPostBody = PostMutationBody & {
    media: PostVideoMediaInput;
};
export declare class PostsService implements OnModuleInit, OnModuleDestroy {
    private readonly postRepo;
    private readonly likeRepo;
    private readonly saveRepo;
    private readonly commentRepo;
    private readonly reportRepo;
    private readonly followRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly videoUploadRepo;
    private readonly pagesService;
    private readonly storage;
    private readonly videoStorage;
    private readonly moderationService;
    private readonly objectStorageService;
    private readonly idempotencyService;
    private readonly notificationsService;
    private cleanupTimer?;
    constructor(postRepo: Repository<CommunityPost>, likeRepo: Repository<PostLike>, saveRepo: Repository<PostSave>, commentRepo: Repository<PostComment>, reportRepo: Repository<PostReport>, followRepo: Repository<ProfileFollow>, jobRepo: Repository<Job>, userRepo: Repository<User>, videoUploadRepo: Repository<PostVideoUploadSession>, pagesService: PagesService, storage: PostStorageService, videoStorage: PostVideoStorageService, moderationService: ModerationService, objectStorageService: ObjectStorageService, idempotencyService: IdempotencyService, notificationsService: NotificationsService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    getFeed(query: PostFeedQuery, viewerId: number): Promise<{
        data: any[];
        nextCursor: string;
    }>;
    searchPosts(query: PostSearchQuery, viewerId: number): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getPost(postId: number, viewerId: number): Promise<any>;
    createVideoUpload(data: CreateVideoPostBody, userId: number, idempotencyKey?: string): Promise<{
        post: any;
        upload: {
            uploadId: string;
            method: string;
            url: string;
            fields: {
                uploadId: string;
            };
            headers: {};
            fileField: string;
            expiresAt: Date;
        };
    }>;
    private createVideoUploadInternal;
    createVideoReplacement(postId: number, media: PostVideoMediaInput, userId: number, idempotencyKey?: string): Promise<{
        post: any;
        upload: {
            uploadId: string;
            method: string;
            url: string;
            fields: {
                uploadId: string;
            };
            headers: {};
            fileField: string;
            expiresAt: Date;
        };
    }>;
    private createVideoReplacementInternal;
    uploadVideo(postId: number, userId: number, uploadId: string, file?: Express.Multer.File): Promise<{
        uploadId: string;
        postId: string;
        status: string;
        fileName: string;
        fileSizeBytes: number;
        contentType: string;
    }>;
    completeVideoUpload(postId: number, userId: number, uploadId: string): Promise<any>;
    createPost(data: PostMutationBody, image: Express.Multer.File | undefined, userId: number, idempotencyKey?: string): Promise<any>;
    private createPostInternal;
    updatePost(postId: number, data: PostMutationBody, image: Express.Multer.File | undefined, userId: number): Promise<any>;
    deletePost(postId: number, userId: number): Promise<{
        id: string;
        deleted: boolean;
    }>;
    like(postId: number, userId: number): Promise<any>;
    unlike(postId: number, userId: number): Promise<any>;
    save(postId: number, userId: number): Promise<any>;
    unsave(postId: number, userId: number): Promise<any>;
    share(postId: number, userId: number): Promise<any>;
    getComments(postId: number, viewerId: number, cursor?: string, limit?: number): Promise<{
        data: {
            id: string;
            postId: string;
            author: {
                avatarUri: string;
                type: "user";
                id: string;
                name: string;
                handle: string;
                verified: boolean;
            };
            text: string;
            createdAt: Date;
        }[];
        nextCursor: string;
    }>;
    addComment(postId: number, userId: number, text: string, idempotencyKey?: string): Promise<{
        id: string;
        postId: string;
        author: {
            avatarUri: string;
            type: "user";
            id: string;
            name: string;
            handle: string;
            verified: boolean;
        };
        text: string;
        createdAt: Date;
    }>;
    private addCommentInternal;
    deleteComment(postId: number, commentId: number, userId: number, isSystemAdmin?: boolean): Promise<{
        id: string;
        postId: string;
        deleted: boolean;
    }>;
    report(postId: number, userId: number, reason?: string, details?: string): Promise<{
        reported: boolean;
    }>;
    private getManageableFeed;
    private applyBlockedPublisherFilters;
    private createViewableQuery;
    private applyPublisherFilter;
    private getViewablePostOrThrow;
    private getPostByIdOrThrow;
    private resolvePublisher;
    private validateLinkedJob;
    private assertCanManage;
    private formatPosts;
    private formatPost;
    private formatPostBase;
    private formatMedia;
    private formatPublisher;
    private formatLinkedJob;
    private formatComment;
    private withPublisherAsset;
    private canManage;
    private getCompanyPublishingAccess;
    private canManageFromAccess;
    private isLinkedJobPublic;
    private getPublisherType;
    private getPublisherId;
    private publisherFollowExistsSql;
    private createVideoUploadSession;
    private validateVideoMetadata;
    private validateUploadedVideo;
    private getOwnedVideoUploadSession;
    private isExpired;
    private expireVideoUploadSession;
    cleanupExpiredVideoUploads(): Promise<void>;
    private clearVideoMedia;
    private normalizeBody;
    private parseBoolean;
    private getSearchPatterns;
    private decrementCounter;
    private wasInserted;
    private encodeCursor;
    private decodeCursor;
    private encodeSimpleCursor;
    private decodeSimpleCursor;
}
export {};
