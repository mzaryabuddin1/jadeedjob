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
import { Reel } from './reel.entity';
import { User } from 'src/users/entities/user.entity';

export type ReelUploadSessionStatus =
  | 'pending'
  | 'uploaded'
  | 'completed'
  | 'expired'
  | 'failed';

export type ReelStorageProvider = 'local' | 'object';

@Entity('reel_upload_sessions')
@Index(['uploadId'], { unique: true })
@Index(['reelId', 'userId'])
@Index('IDX_reel_upload_sessions_uploaded_asset', ['uploadedAssetId'])
export class ReelUploadSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  uploadId: string;

  @Column()
  reelId: number;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reelId' })
  reel: Reel;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  uploadKey: string;

  @Column({
    type: 'enum',
    enum: ['local', 'object'],
    default: 'local',
  })
  storageProvider: ReelStorageProvider;

  @Column({
    type: 'enum',
    enum: ['pending', 'uploaded', 'completed', 'expired', 'failed'],
    default: 'pending',
  })
  status: ReelUploadSessionStatus;

  @Column()
  originalFileName: string;

  @Column()
  contentType: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  expectedFileSizeBytes: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  durationSeconds: number;

  @Column({ nullable: true })
  uploadedFileName: string;

  @Column({ nullable: true, length: 2000 })
  localFilePath: string;

  @Column({ nullable: true, length: 2000 })
  publicUrl: string;

  @Column({
    nullable: true,
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  uploadedAssetId: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  uploadedFileSizeBytes: number;

  @Column({ nullable: true })
  uploadedContentType: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
