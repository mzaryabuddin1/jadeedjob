import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { ChatService } from './chat.service';
import { Throttle } from '@nestjs/throttler';

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const messageQuerySchema = paginationSchema.keys({
  before: Joi.string()
    .pattern(/^[1-9]\d*$/)
    .optional(),
});

const messageSchema = Joi.object({
  text: Joi.string().allow('', null).max(2000).optional(),
  content: Joi.string().allow('', null).max(2000).optional(),
  mediaUrl: Joi.string().uri().allow('', null).optional(),
  messageType: Joi.string()
    .valid('text', 'image', 'video', 'audio', 'file')
    .default('text'),
  attachments: Joi.array()
    .items(
      Joi.object({
        assetId: Joi.string().guid({ version: 'uuidv4' }).optional(),
        fileUrl: Joi.string().uri().required(),
        fileName: Joi.string().allow('', null).max(255).optional(),
        contentType: Joi.string().allow('', null).max(120).optional(),
      }),
    )
    .max(10)
    .optional(),
  clientMessageId: Joi.string().trim().max(120).optional(),
});

const contextSchema = Joi.object({
  action: Joi.string().valid('invite', 'inquiry').required(),
  profileType: Joi.string().valid('user', 'company').required(),
  profileId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^[1-9]\d*$/))
    .required(),
  jobId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^[1-9]\d*$/))
    .required(),
  clientRequestId: Joi.string().trim().max(120).required(),
});

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatService: ChatService,
    private readonly storageService: ObjectStorageService,
  ) {}

  @Get()
  list(
    @Req() req: any,
    @Query(new JoiValidationPipe(paginationSchema))
    query: { page: number; limit: number },
  ) {
    return this.chatService.listChats(req.user.id, query.page, query.limit);
  }

  @Post('contexts')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createContext(
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new JoiValidationPipe(contextSchema))
    body: {
      action: 'invite' | 'inquiry';
      profileType: 'user' | 'company';
      profileId: string | number;
      jobId: string | number;
      clientRequestId: string;
    },
  ) {
    return this.chatService.createContext(req.user.id, {
      ...body,
      clientRequestId:
        String(idempotencyKey || '').trim() || body.clientRequestId,
    });
  }

  @Get(':chatId/messages')
  getMessages(
    @Param('chatId') chatId: string,
    @Query(new JoiValidationPipe(messageQuerySchema))
    query: { before?: string; page: number; limit: number },
    @Req() req: any,
  ) {
    return this.chatService.getMessages(
      chatId,
      req.user.id,
      query.before || query.page,
      query.limit,
    );
  }

  @Post(':chatId/messages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  sendMessage(
    @Param('chatId') chatId: string,
    @Body(new JoiValidationPipe(messageSchema)) body: any,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(req.user.id, {
      conversationId: chatId,
      content: body.content ?? body.text,
      mediaUrl: body.mediaUrl,
      messageType: body.messageType,
      attachments: body.attachments,
      clientMessageId: body.clientMessageId,
    });
  }

  @Post(':chatId/attachments')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadAttachment(
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    await this.chatService.canWriteConversation(req.user.id, chatId);

    const asset = await this.storageService.store({
      ownerUserId: req.user.id,
      purpose: 'chat-attachments',
      file,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/quicktime',
        'audio/mpeg',
        'audio/mp4',
      ],
      maxBytes: 20 * 1024 * 1024,
      visibility: 'private',
      metadata: { conversationId: chatId },
    });
    return {
      message: 'Attachment uploaded successfully',
      attachment: {
        assetId: asset.id,
        fileName: asset.originalName,
        fileUrl: await this.storageService.getUrl(asset),
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
      },
    };
  }

  @Patch(':chatId/read')
  markRead(@Param('chatId') chatId: string, @Req() req: any) {
    return this.chatService.markRead(chatId, req.user.id);
  }
}
