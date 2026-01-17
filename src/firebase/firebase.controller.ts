import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('firebase')
export class FirebaseController {
  constructor(
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  @Post('test-notification')
  async test(@Body('token') token: string) {
    return this.firebaseService.sendTestToToken(token);
  }
}
