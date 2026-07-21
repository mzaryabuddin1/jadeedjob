import { ReelsService } from './reels.service';
export declare class ReelsController {
    private readonly reelsService;
    constructor(reelsService: ReelsService);
    create(body: any, req: any): Promise<{
        reel: {
            id: string;
            videoUrl: string;
            category: import("./entities/reel.entity").ReelCategory;
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
            author: {
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
                followingPublisher: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: import("./entities/reel.entity").ReelVisibility;
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
    upload(id: number, uploadId: string, file: Express.Multer.File, req: any): Promise<{
        uploadId: string;
        reelId: string;
        status: string;
        fileName: string;
        fileSizeBytes: number;
        contentType: string;
    }>;
    completeUpload(id: number, uploadId: string, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    getFeed(query: any, req: any): Promise<{
        data: {
            id: string;
            videoUrl: string;
            category: import("./entities/reel.entity").ReelCategory;
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
            author: {
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
                followingPublisher: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: import("./entities/reel.entity").ReelVisibility;
            status: import("./entities/reel.entity").ReelStatus;
            allowComments: boolean;
            allowSharing: boolean;
            createdAt: Date;
            publishedAt: Date;
        }[];
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
        relatedReels: {
            id: string;
            videoUrl: string;
            category: import("./entities/reel.entity").ReelCategory;
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
            author: {
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
                followingPublisher: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: import("./entities/reel.entity").ReelVisibility;
            status: import("./entities/reel.entity").ReelStatus;
            allowComments: boolean;
            allowSharing: boolean;
            createdAt: Date;
            publishedAt: Date;
        }[];
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
        originalReel: {
            id: string;
            videoUrl: string;
            category: import("./entities/reel.entity").ReelCategory;
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
            author: {
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
                followingPublisher: boolean;
                followingCreator: boolean;
                isOwner: boolean;
            };
            visibility: import("./entities/reel.entity").ReelVisibility;
            status: import("./entities/reel.entity").ReelStatus;
            allowComments: boolean;
            allowSharing: boolean;
            createdAt: Date;
            publishedAt: Date;
        };
        usageCount: number;
    }>;
    like(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    unlike(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    save(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    unsave(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    getComments(id: number, cursor: string, limit: number, req: any): Promise<{
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
    addComment(id: number, text: string, req: any): Promise<{
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
    share(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
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
    publish(id: number, req: any): Promise<{
        id: string;
        videoUrl: string;
        category: import("./entities/reel.entity").ReelCategory;
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
        author: {
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
            followingPublisher: boolean;
            followingCreator: boolean;
            isOwner: boolean;
        };
        visibility: import("./entities/reel.entity").ReelVisibility;
        status: import("./entities/reel.entity").ReelStatus;
        allowComments: boolean;
        allowSharing: boolean;
        createdAt: Date;
        publishedAt: Date;
    }>;
    delete(id: number, req: any): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
