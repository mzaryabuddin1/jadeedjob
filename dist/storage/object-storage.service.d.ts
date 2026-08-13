import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StoredAsset } from './entities/stored-asset.entity';
type StoreInput = {
    ownerUserId: number;
    purpose: string;
    file: Pick<Express.Multer.File, 'buffer' | 'originalname' | 'mimetype' | 'size' | 'path'>;
    allowedTypes: string[];
    maxBytes: number;
    visibility?: 'public' | 'private';
    metadata?: Record<string, unknown>;
};
export declare class ObjectStorageService implements OnModuleInit {
    private readonly assetRepo;
    private s3;
    private readonly localRoot;
    constructor(assetRepo: Repository<StoredAsset>);
    onModuleInit(): void;
    store(input: StoreInput): Promise<StoredAsset>;
    getUrl(assetOrId: StoredAsset | string, expiresIn?: number): Promise<string>;
    getAsset(assetId: string): Promise<StoredAsset>;
    requireOwnedAsset(assetId: string, ownerUserId: number, purpose?: string): Promise<StoredAsset>;
    findKnownAssetByUrl(value: string): Promise<StoredAsset>;
    remove(assetOrId: StoredAsset | string): Promise<void>;
    getProvider(): 'local' | 's3';
    private getBuffer;
    private detectContentType;
    private safeExtension;
    private normalizeContentType;
}
export {};
