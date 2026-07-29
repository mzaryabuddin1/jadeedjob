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
    remove(assetOrId: StoredAsset | string): Promise<void>;
    private provider;
    private getBuffer;
    private detectContentType;
    private safeExtension;
}
export {};
