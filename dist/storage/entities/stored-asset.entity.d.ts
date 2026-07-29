import { User } from 'src/users/entities/user.entity';
export declare class StoredAsset {
    id: string;
    ownerUserId: number;
    owner: User;
    purpose: string;
    provider: 'local' | 's3';
    bucket: string;
    storageKey: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
    visibility: 'public' | 'private';
    metadata: Record<string, unknown>;
    deletedAt: Date;
    createdAt: Date;
}
