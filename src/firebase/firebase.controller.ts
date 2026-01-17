import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('firebase')
export class FirebaseController {
  constructor(
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  @Get('test-notification')
  async test(@Query('token') token: string) {
    return this.firebaseService.sendTestToToken(token);
  }
}
