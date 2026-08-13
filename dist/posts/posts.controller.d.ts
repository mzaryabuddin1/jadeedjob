import { PostsService } from './posts.service';
import { ModerationService } from 'src/moderation/moderation.service';
export declare class PostsController {
    private readonly postsService;
    private readonly moderationService;
    constructor(postsService: PostsService, moderationService: ModerationService);
    getFeed(query: any, req: any): Promise<{
        data: any[];
        nextCursor: string;
    }>;
    search(query: any, req: any): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    createVideoUpload(body: any, req: any, idempotencyKey?: string): Promise<{
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
    replaceVideoUpload(id: number, body: any, req: any, idempotencyKey?: string): Promise<{
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
    uploadVideo(id: number, uploadId: string, video: Express.Multer.File, req: any): Promise<{
        uploadId: string;
        postId: string;
        status: string;
        fileName: string;
        fileSizeBytes: number;
        contentType: string;
    }>;
    completeVideoUpload(id: number, body: {
        uploadId: string;
    }, req: any): Promise<any>;
    getPost(id: number, req: any): Promise<any>;
    create(body: any, image: Express.Multer.File, req: any, idempotencyKey?: string): Promise<any>;
    update(id: number, body: any, image: Express.Multer.File, req: any): Promise<any>;
    delete(id: number, req: any): Promise<{
        id: string;
        deleted: boolean;
    }>;
    like(id: number, req: any): Promise<any>;
    unlike(id: number, req: any): Promise<any>;
    save(id: number, req: any): Promise<any>;
    unsave(id: number, req: any): Promise<any>;
    share(id: number, req: any): Promise<any>;
    getComments(id: number, query: any, req: any): Promise<{
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
    addComment(id: number, body: any, req: any, idempotencyKey?: string): Promise<{
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
    report(id: number, body: any, req: any): Promise<{
        reportId: string;
        status: import("../moderation/entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportComment(postId: number, commentId: number, body: any, req: any): Promise<{
        reportId: string;
        status: import("../moderation/entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    deleteComment(postId: number, commentId: number, req: any): Promise<{
        id: string;
        postId: string;
        deleted: boolean;
    }>;
}
