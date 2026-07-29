import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfileChatOptionsController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':profileType/:profileId/chat-options')
  getChatOptions(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.chatService.getChatOptions(
      req.user.id,
      profileType,
      profileId,
    );
  }
}
