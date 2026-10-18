import { Post } from './post.entity';
import { User } from 'src/users/entities/user.entity';
export declare class PostLike {
    id: number;
    postId: number;
    post: Post;
    userId: number;
    user: User;
    createdAt: Date;
}
export declare class PostComment {
    id: number;
    postId: number;
    post: Post;
    userId: number;
    user: User;
    parentId: number | null;
    text: string;
    repliesCount: number;
    deletedAt: Date | null;
    createdAt: Date;
}
export declare class PostShare {
    id: number;
    postId: number;
    post: Post;
    userId: number;
    user: User;
    channel: string;
    createdAt: Date;
}
export declare class PostViewer {
    postId: number;
    post: Post;
    userId: number;
    user: User;
    firstSeenAt: Date;
}
export declare class PostStatsDaily {
    postId: number;
    post: Post;
    day: string;
    impressions: number;
    views: number;
    newViewers: number;
    watchTimeMs: number;
    completions: number;
    likes: number;
    comments: number;
    shares: number;
}
export declare class PostHashtag {
    postId: number;
    post: Post;
    tag: string;
}
