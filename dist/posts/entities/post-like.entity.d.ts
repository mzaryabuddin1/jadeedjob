import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
export declare class PostLike {
    id: number;
    postId: number;
    post: CommunityPost;
    userId: number;
    user: User;
    createdAt: Date;
}
