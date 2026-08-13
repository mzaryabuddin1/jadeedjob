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

@Entity('community_post_comments')
@Index('IDX_community_post_comments_post_created', ['postId', 'createdAt'])
export class PostComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => CommunityPost, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'postId',
    foreignKeyConstraintName: 'FK_community_post_comments_post',
  })
  post: CommunityPost;

  @Column()
  userId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_community_post_comments_user',
  })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: ['visible', 'hidden', 'removed'],
    default: 'visible',
  })
  moderationStatus: 'visible' | 'hidden' | 'removed';

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ nullable: true })
  deletedByUserId: number | null;

  @Column({ nullable: true, length: 80 })
  deletionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
