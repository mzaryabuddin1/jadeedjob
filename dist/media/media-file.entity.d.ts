export type MediaKind = 'image' | 'video';
export declare class MediaFile {
    id: number;
    userId: number;
    kind: MediaKind;
    mimeType: string;
    size: number;
    filename: string;
    url: string;
    usedAt: Date | null;
    createdAt: Date;
}
