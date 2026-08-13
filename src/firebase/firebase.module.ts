import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [
    FirebaseService,
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        if (process.env.NODE_ENV === 'test') {
          return {
            messaging: () => ({
              send: async () => 'mock-message-id',
              sendEachForMulticast: async ({ tokens }: { tokens: string[] }) => ({
                successCount: tokens.length,
                failureCount: 0,
                responses: tokens.map(() => ({ success: true })),
              }),
              subscribeToTopic: async () => ({}),
              unsubscribeFromTopic: async () => ({}),
            }),
          } as unknown as admin.app.App;
        }
        if (admin.apps.length > 0) {
          return admin.app();
        }

        let credential: admin.credential.Credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
          );
          credential = admin.credential.cert(serviceAccount);
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          credential = admin.credential.applicationDefault();
        } else if (
          !['staging', 'production'].includes(process.env.NODE_ENV || '')
        ) {
          const serviceAccount = require('./jobslootstaging-8fa70d6ad08a.json');
          credential = admin.credential.cert(serviceAccount);
        } else {
          throw new Error(
            'Firebase credentials are required in staging and production',
          );
        }

        return admin.initializeApp({
          credential,
        });
      },
    },
  ],
  exports: [FirebaseService],
})
export class FirebaseModule {}
