import { MediaService } from './media.service';
export declare class MediaController {
    private readonly media;
    constructor(media: MediaService);
    upload(file: Express.Multer.File, req: any): Promise<{
        id: number;
        kind: import("./media-file.entity").MediaKind;
        url: string;
        mimeType: string;
        size: number;
    }>;
    remove(id: number, req: any): Promise<{
        message: string;
    }>;
}
