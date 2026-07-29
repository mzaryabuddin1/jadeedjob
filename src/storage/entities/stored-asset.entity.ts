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

@Entity('stored_assets')
@Index('IDX_stored_assets_owner_purpose', ['ownerUserId', 'purpose'])
@Index('IDX_stored_assets_storage_key', ['storageKey'], { unique: true })
export class StoredAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'ownerUserId',
    foreignKeyConstraintName: 'FK_stored_assets_owner',
  })
  owner: User;

  @Column({ length: 80 })
  purpose: string;

  @Column({ type: 'enum', enum: ['local', 's3'] })
  provider: 'local' | 's3';

  @Column({ nullable: true })
  bucket: string;

  @Column({ length: 500 })
  storageKey: string;

  @Column({ nullable: true, length: 255 })
  originalName: string;

  @Column({ length: 120 })
  contentType: string;

  @Column({ type: 'bigint', unsigned: true })
  sizeBytes: number;

  @Column({ length: 64 })
  sha256: string;

  @Column({ type: 'enum', enum: ['public', 'private'], default: 'private' })
  visibility: 'public' | 'private';

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
