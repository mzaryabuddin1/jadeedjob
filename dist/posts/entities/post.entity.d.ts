import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { Job } from 'src/job/entities/job.entity';
export type PostKind = 'post' | 'reel';
export type PostMedia = {
    id: number;
    kind: 'image' | 'video';
    url: string;
    mimeType: string;
    size: number;
    thumbnailUrl?: string | null;
};
export declare class Post {
    id: number;
    kind: PostKind;
    authorId: number;
    author: User;
    pageId: number | null;
    page: Page | null;
    text: string | null;
    media: PostMedia[];
    durationMs: number | null;
    jobId: number | null;
    job: Job | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    impressionsCount: number;
    reachCount: number;
    watchTimeMs: number;
    completionsCount: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare function countContent(repo: Repository<Post>, where: {
    userId: number;
} | {
    pageId: number;
}): Promise<{
    posts: number;
    reels: number;
}>;
