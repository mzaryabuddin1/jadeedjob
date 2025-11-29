export declare class SendMessageDto {
    jobApplicationId: number;
    content?: string;
    mediaUrl?: string;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
}
