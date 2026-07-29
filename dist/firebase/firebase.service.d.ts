import * as admin from 'firebase-admin';
export declare class FirebaseService {
    private readonly firebaseApp;
    constructor(firebaseApp: admin.app.App);
    sendNotification(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<{
        successCount: number;
        failureCount: number;
        invalidTokens: string[];
    }>;
    subscribeTokenToFilters(token: string, filterIds: number[]): Promise<void>;
    updateFilterSubscriptions(token: string, oldFilters: number[], newFilters: number[]): Promise<void>;
    sendToFilterTopic(filterId: number, title: string, body: string, data?: Record<string, string>): Promise<string>;
    sendTestToToken(token: string): Promise<{
        successCount: number;
        failureCount: number;
        invalidTokens: string[];
    }>;
}
