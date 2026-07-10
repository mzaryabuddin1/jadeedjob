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
    storageKey: string;
    localFilePath: string;
    publicUrl: string;
};
export declare class ReelStorageService {
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
    commitLocalUpload(reel: Reel, session: ReelUploadSession, file: Express.Multer.File): Promise<StoredReelFile>;
    deleteLocalFile(filePath?: string): Promise<void>;
}
export {};
