import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseApp: admin.app.App,
  ) {}

  async sendNotification(tokens: string[], title: string, body: string) {
    return this.firebaseApp.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });
  }
}
