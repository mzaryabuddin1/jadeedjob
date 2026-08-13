import { ObjectStorageService } from 'src/storage/object-storage.service';
export declare const POST_IMAGE_FIELD = "image";
export declare const POST_IMAGE_MAX_BYTES: number;
export declare const getPostUploadRoot: () => string;
export declare const isAllowedPostImage: (file?: Express.Multer.File) => boolean;
export declare const isAllowedPostImageMetadata: (mimeType?: string, fileName?: string) => boolean;
export declare class PostStorageService {
    private readonly objectStorage;
    constructor(objectStorage: ObjectStorageService);
    save(postId: number, userId: number, file: Express.Multer.File): Promise<{
        assetId: string;
        storageKey: string;
        publicUrl: string;
    }>;
    remove(assetId?: string | null, legacyStorageKey?: string | null): Promise<void>;
}
