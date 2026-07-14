export declare class SendMessageDto {
    jobApplicationId: number;
    content?: string;
    mediaUrl?: string;
    attachments?: Array<{
        fileUrl: string;
        fileName?: string;
        contentType?: string;
    }>;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
}
