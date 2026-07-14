import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { FilesService } from 'src/files/files.service';
import { ChatService } from './chat.service';

const chatAttachmentUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = './uploads/chat-attachments';
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
};

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatService: ChatService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  list(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.chatService.listChats(req.user.id, Number(page), Number(limit));
  }

  @Get(':chatId/messages')
  getMessages(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: any,
  ) {
    return this.chatService.getMessages(chatId, req.user.id, Number(page), Number(limit));
  }

  @Post(':chatId/messages')
  sendMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          text: Joi.string().allow('', null).optional(),
          content: Joi.string().allow('', null).optional(),
          mediaUrl: Joi.string().allow('', null).optional(),
          messageType: Joi.string()
            .valid('text', 'image', 'video', 'audio', 'file')
            .default('text'),
          attachments: Joi.array()
            .items(
              Joi.object({
                fileUrl: Joi.string().required(),
                fileName: Joi.string().allow('', null).optional(),
                contentType: Joi.string().allow('', null).optional(),
              }),
            )
            .optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(req.user.id, {
      jobApplicationId: chatId,
      content: body.content ?? body.text,
      mediaUrl: body.mediaUrl,
      messageType: body.messageType,
      attachments: body.attachments,
    });
  }

  @Post(':chatId/attachments')
  @UseInterceptors(FileInterceptor('file', chatAttachmentUploadOptions))
  async uploadAttachment(
    @Param('chatId', ParseIntPipe) chatId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const allowed = await this.chatService.userCanAccessApplication(
      req.user.id,
      chatId,
    );
    if (!allowed) throw new ForbiddenException('You cannot update this chat');

    const fileUrl = this.filesService.getFileUrl(file.filename, 'chat-attachments');
    return {
      message: 'Attachment uploaded successfully',
      attachment: this.chatService.formatUploadedAttachment(file, fileUrl),
    };
  }

  @Patch(':chatId/read')
  markRead(@Param('chatId', ParseIntPipe) chatId: number, @Req() req: any) {
    return this.chatService.markRead(chatId, req.user.id);
  }
}
