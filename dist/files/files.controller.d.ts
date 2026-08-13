import { FilesService } from './files.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
export declare class FilesController {
    private readonly filesService;
    private readonly storageService;
    constructor(filesService: FilesService, storageService: ObjectStorageService);
    uploadFile(file: Express.Multer.File, req: any): Promise<{
        message: string;
        fileName: string;
        fileUrl: string;
        assetId: string;
        contentType: string;
        sizeBytes: number;
    }>;
}
