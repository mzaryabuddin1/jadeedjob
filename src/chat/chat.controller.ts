// src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('application/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: any,
  ) {
    return this.chatService.getMessages(id, req.user.id, +page, +limit);
  }
}
