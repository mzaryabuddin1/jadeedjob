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
import { Job } from 'src/job/entities/job.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { User } from 'src/users/entities/user.entity';

export type PostPublisherType = 'user' | 'company';
export type PostMediaType = 'none' | 'image' | 'video';
export type PostMediaStatus = 'published' | 'upload_pending' | 'failed';

@Entity('community_posts')
@Index('IDX_community_posts_deleted_created', ['deletedAt', 'createdAt'])
@Index('IDX_community_posts_user_created', [
  'publisherType',
  'creatorId',
  'createdAt',
])
@Index('IDX_community_posts_company_created', [
  'publisherType',
  'publisherCompanyId',
  'createdAt',
])
@Index('IDX_community_posts_media_status_created', [
  'mediaStatus',
  'deletedAt',
  'createdAt',
])
@Index('IDX_community_posts_image_asset', ['imageAssetId'])
@Index('IDX_community_posts_video_asset', ['videoAssetId'])
@Index('IDX_community_posts_video_thumbnail_asset', ['videoThumbnailAssetId'])
export class CommunityPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creatorId',
    foreignKeyConstraintName: 'FK_community_posts_creator',
  })
  creator: User;

  @Column({ type: 'enum', enum: ['user', 'company'], default: 'user' })
  publisherType: PostPublisherType;

  @Column({ nullable: true })
  publisherCompanyId: number | null;

  @ManyToOne(() => CompanyPage, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'publisherCompanyId',
    foreignKeyConstraintName: 'FK_community_posts_company',
  })
  publisherCompany: CompanyPage | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ nullable: true, length: 2000 })
  imageUrl: string | null;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  imageAssetId: string | null;

  @Column({ nullable: true, length: 500 })
  imageStorageKey: string | null;

  @Column({
    type: 'enum',
    enum: ['none', 'image', 'video'],
    default: 'none',
  })
  mediaType: PostMediaType;

  @Column({
    type: 'enum',
    enum: ['published', 'upload_pending', 'failed'],
    default: 'published',
  })
  mediaStatus: PostMediaStatus;

  @Column({ nullable: true, length: 2000 })
  videoUrl: string | null;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  videoAssetId: string | null;

  @Column({ nullable: true, length: 500 })
  videoStorageKey: string | null;

  @Column({ nullable: true, length: 2000 })
  videoThumbnailUrl: string | null;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  videoThumbnailAssetId: string | null;

  @Column({ nullable: true, length: 500 })
  videoThumbnailStorageKey: string | null;

  @Column({ nullable: true, length: 100 })
  videoContentType: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  videoFileSizeBytes: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  videoDurationSeconds: number | null;

  @Column({ nullable: true })
  linkedJobId: number | null;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'linkedJobId',
    foreignKeyConstraintName: 'FK_community_posts_job',
  })
  linkedJob: Job | null;

  @Column({ default: true })
  allowComments: boolean;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  commentsCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  savesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sharesCount: number;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({
    type: 'enum',
    enum: ['visible', 'hidden', 'removed'],
    default: 'visible',
  })
  moderationStatus: 'visible' | 'hidden' | 'removed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
