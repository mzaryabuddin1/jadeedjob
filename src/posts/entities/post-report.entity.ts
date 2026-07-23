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

@Entity('community_post_reports')
@Index('UQ_community_post_reports_post_user', ['postId', 'userId'], {
  unique: true,
})
export class PostReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => CommunityPost, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'postId',
    foreignKeyConstraintName: 'FK_community_post_reports_post',
  })
  post: CommunityPost;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_community_post_reports_user',
  })
  user: User;

  @Column({ length: 40, default: 'other' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
