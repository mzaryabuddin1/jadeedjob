export declare class Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    body: string;
    data: Record<string, string> | null;
    readAt: Date | null;
    createdAt: Date;
}
