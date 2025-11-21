import * as admin from 'firebase-admin';
export declare class FirebaseService {
    private readonly firebaseApp;
    constructor(firebaseApp: admin.app.App);
    sendNotification(tokens: string[], title: string, body: string): Promise<import("firebase-admin/lib/messaging/messaging-api").BatchResponse>;
}
