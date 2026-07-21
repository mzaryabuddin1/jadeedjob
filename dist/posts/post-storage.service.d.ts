export declare const POST_IMAGE_FIELD = "image";
export declare const POST_IMAGE_MAX_BYTES: number;
export declare const getPostUploadRoot: () => string;
export declare const isAllowedPostImage: (file?: Express.Multer.File) => boolean;
export declare const isAllowedPostImageMetadata: (mimeType?: string, fileName?: string) => boolean;
export declare class PostStorageService {
    save(postId: number, file: Express.Multer.File): Promise<{
        storageKey: string;
        publicUrl: string;
    }>;
    remove(storageKey?: string | null): Promise<void>;
}
