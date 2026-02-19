import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// @UseGuards(JwtAuthGuard)
@Controller('firebase')
export class FirebaseController {
  constructor(
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  @Get('test-notification')
  async test(@Query('token') token: string) {
    return this.firebaseService.sendTestToToken(token);
  }

  @Post('subscribe-filter')
  async subscribeToFilter(
    @Body('filterId') filterId: number,
    @Body('token') token: string,
  ) {
    if (!filterId || !token) {
      return {
        success: false,
        message: 'filterId and token are required',
      };
    }

    await this.firebaseService.subscribeTokenToFilters(token, [filterId]);

    return {
      success: true,
      message: `Subscribed token to filter_${filterId}`,
    };
  }
  
}
