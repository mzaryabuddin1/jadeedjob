import * as admin from 'firebase-admin';
export declare class FirebaseService {
    private readonly firebaseApp;
    constructor(firebaseApp: admin.app.App);
    sendNotification(tokens: string[], title: string, body: string): Promise<import("firebase-admin/lib/messaging/messaging-api").BatchResponse>;
    sendToTokens(tokens: string[], notification: {
        title: string;
        body: string;
    }, data?: Record<string, string>): Promise<{
        success: number;
        failure: number;
        errors: Record<string, {
            count: number;
            hint: string;
        }>;
    }>;
    sendDetailed(tokens: string[], notification: {
        title: string;
        body: string;
    }, data?: Record<string, string>): Promise<{
        token: string;
        ok: boolean;
        messageId?: string;
        code?: string;
        message?: string;
        hint?: string;
    }[]>;
    getProjectId(): string | undefined;
    hintForError(code?: string): string;
    subscribeTokenToFilters(token: string, filterIds: number[]): Promise<void>;
    updateFilterSubscriptions(token: string, oldFilters: number[], newFilters: number[]): Promise<void>;
    sendToFilterTopic(filterId: number, title: string, body: string, data?: Record<string, string>): Promise<string>;
    sendTestToToken(token: string): Promise<string>;
}
