import { PostsService } from './posts.service';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    getFeed(query: any, req: any): Promise<{
        data: {
            viewerState: {
                liked: boolean;
                saved: boolean;
                followingPublisher: boolean;
                isOwner: boolean;
                canManage: boolean;
            };
            stats: {
                likes: number;
                comments: number;
                saves: number;
                shares: number;
            };
            allowComments: boolean;
            createdAt: Date;
            updatedAt: Date;
            linkedJob?: {
                id: string;
                title: string;
                companyName: string;
                salaryAmount: number;
                salaryType: string;
                currency: string;
            };
            id: string;
            publisher: {
                id: string;
                type: "company";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            } | {
                id: string;
                type: "user";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            body: string;
            imageUrl: string;
            media: {
                durationSeconds?: number;
                type: "video";
                url: string;
                thumbnailUrl: string;
            } | {
                type: "image";
                url: string;
            };
            mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
        }[];
        nextCursor: string;
    }>;
    createVideoUpload(body: any, req: any): Promise<{
        post: {
            viewerState: {
                liked: boolean;
                saved: boolean;
                followingPublisher: boolean;
                isOwner: boolean;
                canManage: boolean;
            };
            stats: {
                likes: number;
                comments: number;
                saves: number;
                shares: number;
            };
            allowComments: boolean;
            createdAt: Date;
            updatedAt: Date;
            linkedJob?: {
                id: string;
                title: string;
                companyName: string;
                salaryAmount: number;
                salaryType: string;
                currency: string;
            };
            id: string;
            publisher: {
                id: string;
                type: "company";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            } | {
                id: string;
                type: "user";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            body: string;
            imageUrl: string;
            media: {
                durationSeconds?: number;
                type: "video";
                url: string;
                thumbnailUrl: string;
            } | {
                type: "image";
                url: string;
            };
            mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
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
    replaceVideoUpload(id: number, body: any, req: any): Promise<{
        post: {
            viewerState: {
                liked: boolean;
                saved: boolean;
                followingPublisher: boolean;
                isOwner: boolean;
                canManage: boolean;
            };
            stats: {
                likes: number;
                comments: number;
                saves: number;
                shares: number;
            };
            allowComments: boolean;
            createdAt: Date;
            updatedAt: Date;
            linkedJob?: {
                id: string;
                title: string;
                companyName: string;
                salaryAmount: number;
                salaryType: string;
                currency: string;
            };
            id: string;
            publisher: {
                id: string;
                type: "company";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            } | {
                id: string;
                type: "user";
                name: string;
                handle: string;
                avatarUri: string;
                verified: boolean;
            };
            body: string;
            imageUrl: string;
            media: {
                durationSeconds?: number;
                type: "video";
                url: string;
                thumbnailUrl: string;
            } | {
                type: "image";
                url: string;
            };
            mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
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
    }, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    getPost(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    create(body: any, image: Express.Multer.File, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    update(id: number, body: any, image: Express.Multer.File, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    delete(id: number, req: any): Promise<{
        id: string;
        deleted: boolean;
    }>;
    like(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    unlike(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    save(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    unsave(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    share(id: number, req: any): Promise<{
        viewerState: {
            liked: boolean;
            saved: boolean;
            followingPublisher: boolean;
            isOwner: boolean;
            canManage: boolean;
        };
        stats: {
            likes: number;
            comments: number;
            saves: number;
            shares: number;
        };
        allowComments: boolean;
        createdAt: Date;
        updatedAt: Date;
        linkedJob?: {
            id: string;
            title: string;
            companyName: string;
            salaryAmount: number;
            salaryType: string;
            currency: string;
        };
        id: string;
        publisher: {
            id: string;
            type: "company";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            id: string;
            type: "user";
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        body: string;
        imageUrl: string;
        media: {
            durationSeconds?: number;
            type: "video";
            url: string;
            thumbnailUrl: string;
        } | {
            type: "image";
            url: string;
        };
        mediaStatus: import("./entities/community-post.entity").PostMediaStatus;
    }>;
    getComments(id: number, query: any, req: any): Promise<{
        data: {
            id: string;
            postId: string;
            author: {
                type: "user";
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
    addComment(id: number, body: any, req: any): Promise<{
        id: string;
        postId: string;
        author: {
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        text: string;
        createdAt: Date;
    }>;
    report(id: number, body: any, req: any): Promise<{
        reported: boolean;
    }>;
}
