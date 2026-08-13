import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ReelsService } from './reels.service';
import { ModerationService } from 'src/moderation/moderation.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOptionalIdempotencyKey } from 'src/idempotency/idempotency.decorators';
import { ApiCommunityAcceptanceRequired } from 'src/legal/legal.decorators';
import { ApiCreateModerationReport } from 'src/moderation/moderation.decorators';
import {
  ensureDirectorySync,
  getReelMaxFileSizeBytes,
  getReelTmpUploadDir,
  isAllowedReelFileName,
  isAllowedReelMimeType,
  REEL_VIDEO_FILE_FIELD,
} from './reel-storage.service';
import { Throttle } from '@nestjs/throttler';
import { CommunityGuidelinesGuard } from 'src/legal/community-guidelines.guard';

const createReelSchema = Joi.object({
  caption: Joi.string().trim().min(5).max(300).required(),
  category: Joi.string().valid('community', 'jobs', 'social').required(),
  audioTitle: Joi.string().trim().max(80).allow('', null).optional(),
  linkedJobId: Joi.number().integer().positive().optional(),
  visibility: Joi.string().valid('public', 'followers', 'draft').required(),
  allowComments: Joi.boolean().required(),
  allowSharing: Joi.boolean().required(),
  media: Joi.object({
    fileName: Joi.string().trim().max(255).required(),
    contentType: Joi.string().trim().max(100).required(),
    fileSizeBytes: Joi.number().integer().positive().optional(),
    durationSeconds: Joi.number().positive().max(60).optional(),
  }).required(),
  publisher: Joi.alternatives()
    .try(
      Joi.object({
        type: Joi.string().valid('user').required(),
      }),
      Joi.object({
        type: Joi.string().valid('company').required(),
        id: Joi.number().integer().positive().required(),
      }),
    )
    .optional(),
});

const feedQuerySchema = Joi.object({
  feed: Joi.string().valid('forYou', 'following', 'mine').default('forYou'),
  category: Joi.string().valid('community', 'jobs', 'social').optional(),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(20).default(10),
  publisherType: Joi.string().valid('user', 'company').optional(),
  publisherId: Joi.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');

const completeUploadSchema = Joi.object({
  uploadId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const addCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).required(),
});

const reportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .valid(
      'spam',
      'harassment',
      'misleading',
      'inappropriate',
      'unsafe',
      'false_information',
      'impersonation',
      'fraud',
      'other',
    )
    .required(),
  details: Joi.string().trim().max(1000).allow('', null).optional(),
});

const commentsQuerySchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const uploadInterceptor = FileInterceptor(REEL_VIDEO_FILE_FIELD, {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDir = getReelTmpUploadDir();
      ensureDirectorySync(uploadDir);
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const extension =
        extname(file.originalname || '').toLowerCase() || '.mp4';
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: getReelMaxFileSizeBytes(),
  },
  fileFilter: (_req, file, callback) => {
    if (
      !isAllowedReelMimeType(file.mimetype) ||
      !isAllowedReelFileName(file.originalname)
    ) {
      callback(
        new BadRequestException('Unsupported reel video file') as any,
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('reels')
@ApiTags('Reels')
@ApiBearerAuth()
export class ReelsController {
  constructor(
    private readonly reelsService: ReelsService,
    private readonly moderationService: ModerationService,
  ) {}

  @Post()
  @UseGuards(CommunityGuidelinesGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiOptionalIdempotencyKey()
  @ApiCommunityAcceptanceRequired()
  @UsePipes(new JoiValidationPipe(createReelSchema))
  create(
    @Body() body: any,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.reelsService.createReel(body, req.user.id, idempotencyKey);
  }

  @Post(':id/upload')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @UseInterceptors(uploadInterceptor)
  upload(
    @Param('id', ParseIntPipe) id: number,
    @Body('uploadId') uploadId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!uploadId) {
      throw new BadRequestException('uploadId is required');
    }

    return this.reelsService.uploadLocalVideo(id, req.user.id, uploadId, file);
  }

  @Post(':id/complete-upload')
  @UseGuards(CommunityGuidelinesGuard)
  @ApiCommunityAcceptanceRequired()
  completeUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(completeUploadSchema))
    body: { uploadId: string },
    @Req() req: any,
  ) {
    return this.reelsService.completeUpload(id, req.user.id, body.uploadId);
  }

  @Get()
  getFeed(
    @Query(new JoiValidationPipe(feedQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.reelsService.getFeed(query, req.user.id);
  }

  @Get('publisher-options')
  getPublisherOptions(@Req() req: any) {
    return this.reelsService.getPublisherOptions(req.user.id);
  }

  @Get('audio/:audioId/reels')
  getReelsByAudio(
    @Param('audioId') audioId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    return this.reelsService.getReelsByAudio(audioId, req.user.id, query);
  }

  @Get(':id/audio')
  getAudio(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.getReelAudio(id, req.user.id);
  }

  @Post(':id/like')
  like(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.likeReel(id, req.user.id);
  }

  @Delete(':id/like')
  unlike(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.unlikeReel(id, req.user.id);
  }

  @Post(':id/save')
  save(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.saveReel(id, req.user.id);
  }

  @Delete(':id/save')
  unsave(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.unsaveReel(id, req.user.id);
  }

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query(new JoiValidationPipe(commentsQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.reelsService.getComments(
      id,
      req.user.id,
      query.cursor,
      query.limit,
    );
  }

  @Post(':id/comments')
  @UseGuards(CommunityGuidelinesGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOptionalIdempotencyKey()
  @ApiCommunityAcceptanceRequired()
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(addCommentSchema)) body: { text: string },
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.reelsService.addComment(
      id,
      req.user.id,
      body.text,
      idempotencyKey,
    );
  }

  @Post(':id/share')
  share(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.registerShare(id, req.user.id);
  }

  @Post(':id/report')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiCreateModerationReport('Report a visible Reel')
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(reportSchema))
    body: any,
    @Req() req: any,
  ) {
    return this.moderationService.reportReel(id, req.user.id, body);
  }

  @Post(':reelId/comments/:commentId/report')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiCreateModerationReport('Report a visible Reel comment')
  reportComment(
    @Param('reelId', ParseIntPipe) reelId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body(new JoiValidationPipe(reportSchema)) body: any,
    @Req() req: any,
  ) {
    return this.moderationService.reportReelComment(
      reelId,
      commentId,
      req.user.id,
      body,
    );
  }

  @Delete(':reelId/comments/:commentId')
  deleteComment(
    @Param('reelId', ParseIntPipe) reelId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    return this.reelsService.deleteComment(
      reelId,
      commentId,
      req.user.id,
      req.user.systemRole === 'admin',
    );
  }

  @Post('creators/:creatorId/follow')
  followCreator(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @Req() req: any,
  ) {
    return this.reelsService.followCreator(creatorId, req.user.id);
  }

  @Delete('creators/:creatorId/follow')
  unfollowCreator(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @Req() req: any,
  ) {
    return this.reelsService.unfollowCreator(creatorId, req.user.id);
  }

  @Post(':id/publish')
  @UseGuards(CommunityGuidelinesGuard)
  @ApiCommunityAcceptanceRequired()
  publish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.publishReel(id, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.deleteReel(id, req.user.id);
  }
}
