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
type PostFeedQuery = {
    cursor?: string;
    limit?: number;
    publisherType?: PostPublisherType;
    publisherId?: number;
};
type PostMutationBody = {
    publisherType?: PostPublisherType;
    publisherId?: number | string;
    body?: string | null;
    linkedJobId?: number | string | null;
    allowComments?: boolean | string;
    removeImage?: boolean | string;
};
export declare class PostsService {
    private readonly postRepo;
    private readonly likeRepo;
    private readonly saveRepo;
    private readonly commentRepo;
    private readonly reportRepo;
    private readonly followRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly pagesService;
    private readonly storage;
    constructor(postRepo: Repository<CommunityPost>, likeRepo: Repository<PostLike>, saveRepo: Repository<PostSave>, commentRepo: Repository<PostComment>, reportRepo: Repository<PostReport>, followRepo: Repository<ProfileFollow>, jobRepo: Repository<Job>, userRepo: Repository<User>, pagesService: PagesService, storage: PostStorageService);
    getFeed(query: PostFeedQuery, viewerId: number): Promise<{
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
    getPost(postId: number, viewerId: number): Promise<{
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
    createPost(data: PostMutationBody, image: Express.Multer.File | undefined, userId: number): Promise<{
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
    updatePost(postId: number, data: PostMutationBody, image: Express.Multer.File | undefined, userId: number): Promise<{
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
    deletePost(postId: number, userId: number): Promise<{
        id: string;
        deleted: boolean;
    }>;
    like(postId: number, userId: number): Promise<{
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
    unlike(postId: number, userId: number): Promise<{
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
    save(postId: number, userId: number): Promise<{
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
    unsave(postId: number, userId: number): Promise<{
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
    share(postId: number, userId: number): Promise<{
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
    getComments(postId: number, viewerId: number, cursor?: string, limit?: number): Promise<{
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
    addComment(postId: number, userId: number, text: string): Promise<{
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
    report(postId: number, userId: number, reason?: string, details?: string): Promise<{
        reported: boolean;
    }>;
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
    private formatPublisher;
    private formatLinkedJob;
    private formatComment;
    private canManage;
    private getPublisherType;
    private getPublisherId;
    private publisherFollowExistsSql;
    private normalizeBody;
    private parseBoolean;
    private decrementCounter;
    private encodeCursor;
    private decodeCursor;
    private encodeSimpleCursor;
    private decodeSimpleCursor;
}
export {};
