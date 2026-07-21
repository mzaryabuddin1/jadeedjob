import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
export declare class PostReport {
    id: number;
    postId: number;
    post: CommunityPost;
    userId: number;
    user: User;
    reason: string;
    details: string | null;
    createdAt: Date;
}
