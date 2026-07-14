import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import {
  ensureDirectorySync,
  getReelMaxFileSizeBytes,
  getReelTmpUploadDir,
  isAllowedReelFileName,
  isAllowedReelMimeType,
  REEL_VIDEO_FILE_FIELD,
} from './reel-storage.service';

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
});

const completeUploadSchema = Joi.object({
  uploadId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const addCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).required(),
});

const uploadInterceptor = FileInterceptor(REEL_VIDEO_FILE_FIELD, {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDir = getReelTmpUploadDir();
      ensureDirectorySync(uploadDir);
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const extension = extname(file.originalname || '').toLowerCase() || '.mp4';
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: getReelMaxFileSizeBytes(),
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedReelMimeType(file.mimetype) || !isAllowedReelFileName(file.originalname)) {
      callback(new BadRequestException('Unsupported reel video file') as any, false);
      return;
    }

    callback(null, true);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(createReelSchema))
  create(@Body() body: any, @Req() req: any) {
    return this.reelsService.createReel(body, req.user.id);
  }

  @Post(':id/upload')
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
  @UsePipes(new JoiValidationPipe(completeUploadSchema))
  completeUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body('uploadId') uploadId: string,
    @Req() req: any,
  ) {
    return this.reelsService.completeUpload(id, req.user.id, uploadId);
  }

  @Get()
  getFeed(@Query() query: any, @Req() req: any) {
    return this.reelsService.getFeed(query, req.user.id);
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
    @Query('cursor') cursor: string,
    @Query('limit') limit: number,
    @Req() req: any,
  ) {
    return this.reelsService.getComments(id, req.user.id, cursor, Number(limit));
  }

  @Post(':id/comments')
  @UsePipes(new JoiValidationPipe(addCommentSchema))
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
    @Req() req: any,
  ) {
    return this.reelsService.addComment(id, req.user.id, text);
  }

  @Post(':id/share')
  share(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.registerShare(id, req.user.id);
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
  publish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.publishReel(id, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reelsService.deleteReel(id, req.user.id);
  }
}
