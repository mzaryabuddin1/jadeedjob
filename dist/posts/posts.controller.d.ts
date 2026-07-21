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
        }[];
        nextCursor: string;
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
    }>;
    getComments(id: number, cursor: string, limit: number, req: any): Promise<{
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
    addComment(id: number, text: string, req: any): Promise<{
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
