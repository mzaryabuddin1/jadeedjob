export declare class SendMessageDto {
    jobApplicationId: number;
    content?: string;
    mediaUrl?: string;
    attachments?: Array<{
        assetId?: string;
        fileUrl?: string;
        fileName?: string;
        contentType?: string;
        sizeBytes?: number;
    }>;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
}
