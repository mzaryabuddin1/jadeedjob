import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './community-post.entity';

export type PostVideoUploadStatus =
  | 'pending'
  | 'uploaded'
  | 'completed'
  | 'expired'
  | 'failed';

@Entity('community_post_video_upload_sessions')
@Index('IDX_post_video_upload_id', ['uploadId'], { unique: true })
@Index('IDX_post_video_upload_post_user', ['postId', 'userId'])
@Index('IDX_post_video_upload_uploaded_asset', ['uploadedAssetId'])
@Index('IDX_post_video_upload_thumbnail_asset', ['thumbnailAssetId'])
export class PostVideoUploadSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  uploadId: string;

  @Column()
  postId: number;

  @ManyToOne(() => CommunityPost, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'postId',
    foreignKeyConstraintName: 'FK_post_video_upload_post',
  })
  post: CommunityPost;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_post_video_upload_user',
  })
  user: User;

  @Column({ default: false })
  replacement: boolean;

  @Column({
    type: 'enum',
    enum: ['pending', 'uploaded', 'completed', 'expired', 'failed'],
    default: 'pending',
  })
  status: PostVideoUploadStatus;

  @Column({ nullable: true, length: 500 })
  uploadKey: string | null;

  @Column({ length: 255 })
  originalFileName: string;

  @Column({ length: 100 })
  contentType: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  expectedFileSizeBytes: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  clientDurationSeconds: number | null;

  @Column({ nullable: true, length: 255 })
  uploadedFileName: string | null;

  @Column({ nullable: true, length: 2000 })
  localFilePath: string | null;

  @Column({ nullable: true, length: 2000 })
  publicUrl: string | null;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  uploadedAssetId: string | null;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  thumbnailAssetId: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  uploadedFileSizeBytes: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  uploadedDurationSeconds: number | null;

  @Column({ nullable: true, length: 100 })
  uploadedContentType: string | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
