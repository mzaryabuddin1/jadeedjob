import { ObjectStorageService } from 'src/storage/object-storage.service';
import { Reel } from './entities/reel.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';
export declare const REEL_VIDEO_FILE_FIELD = "video";
export declare const getReelMaxFileSizeBytes: () => number;
export declare const getReelUploadTtlMinutes: () => number;
export declare const getReelUploadRoot: () => string;
export declare const getReelTmpUploadDir: () => string;
export declare const ensureDirectorySync: (path: string) => void;
export declare const isAllowedReelMimeType: (contentType?: string) => boolean;
export declare const isAllowedReelFileName: (fileName?: string) => boolean;
export declare const normalizeReelExtension: (fileName?: string, contentType?: string) => string;
type StoredReelFile = {
    fileName: string;
    assetId: string;
    storageKey: string;
};
export declare class ReelStorageService {
    private readonly objectStorage;
    constructor(objectStorage: ObjectStorageService);
    getUploadInstructions(reel: Reel, session: ReelUploadSession): {
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
    createUploadKey(reelId: number, fileName: string, contentType: string): string;
    commitUpload(reel: Reel, session: ReelUploadSession, file: Express.Multer.File): Promise<StoredReelFile>;
    remove(assetId?: string | null, legacyStorageKey?: string | null): Promise<void>;
    deleteLocalFile(filePath?: string): Promise<void>;
}
export {};
