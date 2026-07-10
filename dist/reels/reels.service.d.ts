import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ReelStorageService } from './reel-storage.service';
import { Reel, ReelCategory, ReelVisibility } from './entities/reel.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelSave } from './entities/reel-save.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ReelCreatorFollow } from './entities/reel-creator-follow.entity';
type CreateReelPayload = {
    caption: string;
    category: ReelCategory;
    audioTitle?: string;
    linkedJobId?: number;
    visibility: ReelVisibility;
    allowComments: boolean;
    allowSharing: boolean;
    media: {
        fileName: string;
        contentType: string;
        fileSizeBytes?: number;
        durationSeconds?: number;
    };
};
type FeedQuery = {
    feed?: 'forYou' | 'following' | 'mine';
    category?: ReelCategory;
    cursor?: string;
    limit?: number;
};
export declare class ReelsService implements OnModuleInit {
    private readonly reelRepo;
    private readonly uploadSessionRepo;
    private readonly likeRepo;
    private readonly saveRepo;
    private readonly commentRepo;
    private readonly followRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly storage;
    private cleanupTimer?;
    constructor(reelRepo: Repository<Reel>, uploadSessionRepo: Repository<ReelUploadSession>, likeRepo: Repository<ReelLike>, saveRepo: Repository<ReelSave>, commentRepo: Repository<ReelComment>, followRepo: Repository<ReelCreatorFollow>, jobRepo: Repository<Job>, userRepo: Repository<User>, storage: ReelStorageService);
    onModuleInit(): void;
    createReel(data: CreateReelPayload, userId: number): Promise<{
        reel: {
            id: string;
            videoUrl: string;
            category: ReelCategory;
            author: {
                id: string;
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            caption: string;
            audioTitle: string;
            linkedJobId: number;
            stats: {
                likes: number;
                comments: number;
                saves: number;
                shares: number;
            };
            viewerState: {
                liked: boolean;
                saved: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: ReelVisibility;
            status: import("./entities/reel.entity").ReelStatus;
            allowComments: boolean;
            allowSharing: boolean;
            createdAt: Date;
            publishedAt: Date;
        };
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
    uploadLocalVideo(reelId: number, userId: number, uploadId: string, file?: Express.Multer.File): Promise<{
        uploadId: string;
        reelId: string;
        status: string;
        fileName: string;
        fileSizeBytes: number;
        contentType: string;
    }>;
    completeUpload(reelId: number, userId: number, uploadId: string): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    getFeed(query: FeedQuery, userId: number): Promise<{
        data: {
            id: string;
            videoUrl: string;
            category: ReelCategory;
            author: {
                id: string;
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            caption: string;
            audioTitle: string;
            linkedJobId: number;
            stats: {
                likes: number;
                comments: number;
                saves: number;
                shares: number;
            };
            viewerState: {
                liked: boolean;
                saved: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: ReelVisibility;
            status: import("./entities/reel.entity").ReelStatus;
            allowComments: boolean;
            allowSharing: boolean;
            createdAt: Date;
            publishedAt: Date;
        }[];
        nextCursor: string;
    }>;
    getComments(reelId: number, userId: number, cursor?: string, limit?: number): Promise<{
        data: {
            id: string;
            reelId: string;
            author: {
                id: string;
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            text: string;
            createdAt: Date;
        }[];
        nextCursor: string;
    }>;
    addComment(reelId: number, userId: number, text: string): Promise<{
        id: string;
        reelId: string;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        text: string;
        createdAt: Date;
    }>;
    likeReel(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    unlikeReel(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    saveReel(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    unsaveReel(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    registerShare(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    followCreator(creatorId: number, followerId: number): Promise<{
        creatorId: string;
        following: boolean;
    }>;
    unfollowCreator(creatorId: number, followerId: number): Promise<{
        creatorId: string;
        following: boolean;
    }>;
    deleteReel(reelId: number, userId: number): Promise<{
        id: string;
        deleted: boolean;
    }>;
    publishReel(reelId: number, userId: number): Promise<{
        id: string;
        videoUrl: string;
        category: ReelCategory;
        author: {
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        caption: string;
        audioTitle: string;
        linkedJobId: number;
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    cleanupExpiredUploadSessions(): Promise<void>;
    private validateCreateMedia;
    private validateUploadedFile;
    private getOwnedUploadSession;
    private getOwnedReelOrThrow;
    private getViewableReelOrThrow;
    private getReelByIdOrThrow;
    private formatReels;
    private formatReel;
    private formatReelSync;
    private formatComment;
    private formatAuthor;
    private getUploadExpiry;
    private isExpired;
    private markSessionExpired;
    private incrementCounter;
    private decrementCounter;
    private encodeCursor;
    private decodeCursor;
}
export {};
