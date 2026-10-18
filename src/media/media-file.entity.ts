import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type MediaKind = 'image' | 'video';

/**
 * Every uploaded image / video is recorded with its owner. A post can only
 * attach files its author uploaded and that are not used yet; files nobody
 * attached within 24 hours are deleted.
 */
@Entity('media_files')
@Index('IDX_media_user_unused', ['userId', 'usedAt'])
export class MediaFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 5 })
  kind: MediaKind;

  @Column({ type: 'varchar', length: 40 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  /** file name inside ./uploads/media */
  @Column({ type: 'varchar', length: 120 })
  filename: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  /** set when a post attached the file */
  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
