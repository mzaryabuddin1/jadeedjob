import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
export declare class PostComment {
    id: number;
    postId: number;
    post: CommunityPost;
    userId: number;
    user: User;
    text: string;
    moderationStatus: 'visible' | 'hidden' | 'removed';
    deletedAt: Date | null;
    deletedByUserId: number | null;
    deletionReason: string | null;
    createdAt: Date;
}
