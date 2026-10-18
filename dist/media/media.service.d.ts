import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { MediaFile, MediaKind } from './media-file.entity';
export declare const MEDIA_DIR = "./uploads/media";
export declare const allowedMimeTypes: () => string[];
export declare const extensionFor: (mime: string) => string;
export declare const maxImageBytes: () => number;
export declare const maxVideoBytes: () => number;
export declare const MULTER_HARD_LIMIT: number;
export declare class MediaService implements OnModuleInit, OnModuleDestroy {
    private readonly repo;
    private readonly logger;
    private timer;
    constructor(repo: Repository<MediaFile>);
    publicUrl(filename: string): string;
    register(userId: number, file: Express.Multer.File): Promise<{
        id: number;
        kind: MediaKind;
        url: string;
        mimeType: string;
        size: number;
    }>;
    view(m: MediaFile): {
        id: number;
        kind: MediaKind;
        url: string;
        mimeType: string;
        size: number;
    };
    claim(userId: number, ids: number[], manager?: EntityManager): Promise<MediaFile[]>;
    deleteUnused(userId: number, id: number): Promise<{
        message: string;
    }>;
    onModuleInit(): void;
    onModuleDestroy(): void;
    cleanup(): Promise<void>;
    private unlink;
}
