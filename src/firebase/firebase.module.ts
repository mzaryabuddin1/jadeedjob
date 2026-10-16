import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import { FirebaseController } from './firebase.controller';
import { loadServiceAccount } from './service-account.loader';

@Module({
  providers: [
    FirebaseService,
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccount = loadServiceAccount();

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
  ],
  exports: [FirebaseService, 'FIREBASE_ADMIN'],
  controllers: [FirebaseController],
})
export class FirebaseModule {}
