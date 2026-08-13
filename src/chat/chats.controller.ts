import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { ChatService } from './chat.service';
import { Throttle } from '@nestjs/throttler';
import { ChatGateway } from './chat.gateway';
import { CommunityGuidelinesGuard } from 'src/legal/community-guidelines.guard';
import { ModerationService } from 'src/moderation/moderation.service';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { InvitationProjectionDto } from './dto/invitation-api.dto';
import { ApiOptionalIdempotencyKey } from 'src/idempotency/idempotency.decorators';
import { ApiCommunityAcceptanceRequired } from 'src/legal/legal.decorators';
import { ApiCreateModerationReport } from 'src/moderation/moderation.decorators';

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
        fileUrl: Joi.string().uri().optional(),
        fileName: Joi.string().allow('', null).max(255).optional(),
        contentType: Joi.string().allow('', null).max(120).optional(),
        sizeBytes: Joi.number().integer().positive().optional(),
      }).or('assetId', 'fileUrl'),
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

const reportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .valid(
      'spam',
      'harassment',
      'unsafe',
      'fraud',
      'inappropriate',
      'other',
    )
    .required(),
  details: Joi.string().trim().max(1000).allow('', null).optional(),
});

@UseGuards(JwtAuthGuard)
@Controller('chats')
@ApiTags('Chats')
@ApiBearerAuth()
@ApiExtraModels(InvitationProjectionDto)
export class ChatsController {
  constructor(
    private readonly chatService: ChatService,
    private readonly storageService: ObjectStorageService,
    private readonly chatGateway: ChatGateway,
    private readonly moderationService: ModerationService,
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
  @ApiOptionalIdempotencyKey()
  async createContext(
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
    const result = await this.chatService.createContext(req.user.id, {
      ...body,
      clientRequestId:
        String(idempotencyKey || '').trim() || body.clientRequestId,
    });
    if (result.invitation?.invitationId || result.invitation?.id) {
      const updates = await this.chatService.invitationRealtimePayloads(
        result.invitation.invitationId || result.invitation.id,
      );
      this.chatGateway.emitInvitationUpdatedForUsers(updates);
    }
    return result;
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
  @UseGuards(CommunityGuidelinesGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiCommunityAcceptanceRequired()
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
  @UseGuards(CommunityGuidelinesGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiCommunityAcceptanceRequired()
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

  @Post(':conversationId/messages/:messageId/report')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiCreateModerationReport('Report a message in an accessible conversation')
  async reportMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body(new JoiValidationPipe(reportSchema)) body: any,
    @Req() req: any,
  ) {
    const target = await this.chatService.getReportableMessage(
      conversationId,
      messageId,
      req.user.id,
    );
    return this.moderationService.reportResolvedTarget(
      req.user.id,
      body,
      target,
    );
  }
}
