import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';

@Entity('community_post_saves')
@Index('UQ_community_post_saves_post_user', ['postId', 'userId'], {
  unique: true,
})
export class PostSave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => CommunityPost, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'postId',
    foreignKeyConstraintName: 'FK_community_post_saves_post',
  })
  post: CommunityPost;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_community_post_saves_user',
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
