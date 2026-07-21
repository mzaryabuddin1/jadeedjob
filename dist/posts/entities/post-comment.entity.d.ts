import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
export declare class PostComment {
    id: number;
    postId: number;
    post: CommunityPost;
    userId: number;
    user: User;
    text: string;
    createdAt: Date;
}
