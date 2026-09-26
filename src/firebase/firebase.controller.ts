import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FirebaseService } from './firebase.service';

@ApiTags('Firebase')
@Controller('firebase')
export class FirebaseController {
  constructor(
    private firebaseService: FirebaseService,
  ) {}

  @Get('test-notification')
  @ApiOperation({ summary: 'Send test push notification' })
  @ApiQuery({ name: 'token', required: true, description: 'FCM device token' })
  async test(@Query('token') token: string) {
    return this.firebaseService.sendTestToToken(token);
  }

  @Post('subscribe-filter')
  @ApiOperation({ summary: 'Subscribe FCM token to a filter topic' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['filterId', 'token'],
      properties: {
        filterId: { type: 'number', example: 1 },
        token: { type: 'string', example: 'YOUR_FCM_TOKEN' },
      },
    },
  })
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
