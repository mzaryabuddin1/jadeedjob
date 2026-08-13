import { ObjectStorageService } from 'src/storage/object-storage.service';
import { CommunityPost } from './entities/community-post.entity';
import { PostVideoUploadSession } from './entities/post-video-upload-session.entity';
export declare const POST_VIDEO_FILE_FIELD = "video";
export declare const POST_VIDEO_MAX_BYTES: number;
export declare const getPostVideoUploadRoot: () => string;
export declare const getPostVideoTmpDir: () => string;
export declare const ensurePostVideoDirectory: (path: string) => void;
export declare const isAllowedPostVideoMimeType: (contentType?: string) => boolean;
export declare const isAllowedPostVideoFileName: (fileName?: string) => boolean;
export declare const isAllowedPostVideoProbeFormat: (formatName?: string) => boolean;
export declare class PostVideoStorageService {
    private readonly objectStorage;
    constructor(objectStorage: ObjectStorageService);
    getUploadInstructions(post: CommunityPost, session: PostVideoUploadSession): {
        uploadId: string;
        method: string;
        url: string;
        fields: {
            uploadId: string;
        };
        headers: {};
        fileField: string;
        expiresAt: Date;
    };
    createUploadKey(postId: number, fileName: string, contentType: string): string;
    commitUpload(post: CommunityPost, session: PostVideoUploadSession, file: Express.Multer.File): Promise<{
        fileName: string;
        storageKey: string;
        localFilePath: string;
        publicUrl: any;
    }>;
    inspectVideo(localFilePath: string): Promise<{
        durationSeconds: number;
    }>;
    createThumbnail(postId: number, localFilePath: string): Promise<{
        fileName: string;
        localFilePath: string;
    }>;
    storeCompletedMedia(post: CommunityPost, session: PostVideoUploadSession, thumbnail: {
        fileName: string;
        localFilePath: string;
    }): Promise<{
        videoAsset: import("../storage/entities/stored-asset.entity").StoredAsset;
        thumbnailAsset: import("../storage/entities/stored-asset.entity").StoredAsset;
    }>;
    remove(assetId?: string | null, legacyStorageKey?: string | null): Promise<void>;
    deleteLocalFile(path?: string | null): Promise<void>;
}
