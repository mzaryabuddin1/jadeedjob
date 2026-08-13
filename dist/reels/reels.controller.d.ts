import { ReelsService } from './reels.service';
import { ModerationService } from 'src/moderation/moderation.service';
export declare class ReelsController {
    private readonly reelsService;
    private readonly moderationService;
    constructor(reelsService: ReelsService, moderationService: ModerationService);
    create(body: any, req: any, idempotencyKey?: string): Promise<{
        reel: any;
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
    upload(id: number, uploadId: string, file: Express.Multer.File, req: any): Promise<{
        uploadId: string;
        reelId: string;
        status: string;
        fileName: string;
        fileSizeBytes: number;
        contentType: string;
    }>;
    completeUpload(id: number, body: {
        uploadId: string;
    }, req: any): Promise<any>;
    getFeed(query: any, req: any): Promise<{
        data: any[];
        nextCursor: string;
    }>;
    getPublisherOptions(req: any): Promise<{
        data: ({
            disabledReason?: string;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        } | {
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        })[];
    }>;
    getReelsByAudio(audioId: string, query: any, req: any): Promise<{
        audioId: string;
        audioTitle: string;
        usageCount: number;
        relatedReels: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getAudio(id: number, req: any): Promise<{
        audioId: string;
        audioTitle: string;
        publisher: {
            id: string;
            avatarUri: string;
            type: "company";
            name: string;
            handle: string;
            verified: boolean;
        } | {
            id: string;
            avatarUri: string;
            type: "user";
            name: string;
            handle: string;
            verified: boolean;
        };
        creator: {
            id: string;
            avatarUri: string;
            type: "company";
            name: string;
            handle: string;
            verified: boolean;
        } | {
            id: string;
            avatarUri: string;
            type: "user";
            name: string;
            handle: string;
            verified: boolean;
        };
        originalReel: any;
        usageCount: number;
    }>;
    like(id: number, req: any): Promise<any>;
    unlike(id: number, req: any): Promise<any>;
    save(id: number, req: any): Promise<any>;
    unsave(id: number, req: any): Promise<any>;
    getComments(id: number, query: any, req: any): Promise<{
        data: {
            id: string;
            reelId: string;
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
    addComment(id: number, body: {
        text: string;
    }, req: any, idempotencyKey?: string): Promise<{
        id: string;
        reelId: string;
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
    share(id: number, req: any): Promise<any>;
    report(id: number, body: any, req: any): Promise<{
        reportId: string;
        status: import("../moderation/entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportComment(reelId: number, commentId: number, body: any, req: any): Promise<{
        reportId: string;
        status: import("../moderation/entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    deleteComment(reelId: number, commentId: number, req: any): Promise<{
        id: string;
        reelId: string;
        deleted: boolean;
    }>;
    followCreator(creatorId: number, req: any): Promise<{
        creatorId: string;
        profileType: import("../profiles/entities/profile-follow.entity").ProfileType;
        profileId: string;
        following: boolean;
    }>;
    unfollowCreator(creatorId: number, req: any): Promise<{
        creatorId: string;
        profileType: import("../profiles/entities/profile-follow.entity").ProfileType;
        profileId: string;
        following: boolean;
    }>;
    publish(id: number, req: any): Promise<any>;
    delete(id: number, req: any): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
