import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [
    FirebaseService,
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccount = require('./jobslootstaging-8fa70d6ad08a.json');

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
  ],
  exports: [FirebaseService],
})
export class FirebaseModule {}
