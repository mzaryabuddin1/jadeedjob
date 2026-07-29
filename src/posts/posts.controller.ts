import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { randomUUID } from 'crypto';
import Joi from 'joi';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import {
  isAllowedPostImageMetadata,
  POST_IMAGE_FIELD,
  POST_IMAGE_MAX_BYTES,
} from './post-storage.service';
import {
  ensurePostVideoDirectory,
  getPostVideoTmpDir,
  isAllowedPostVideoFileName,
  isAllowedPostVideoMimeType,
  POST_VIDEO_FILE_FIELD,
  POST_VIDEO_MAX_BYTES,
} from './post-video-storage.service';
import { PostsService } from './posts.service';
import { Throttle } from '@nestjs/throttler';

const publisherFields = {
  publisherType: Joi.string().valid('user', 'company').default('user'),
  publisherId: Joi.when('publisherType', {
    is: 'company',
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.any().strip(),
  }),
};

const createPostSchema = Joi.object({
  ...publisherFields,
  body: Joi.string().trim().max(2000).allow('', null).optional(),
  linkedJobId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().allow(''),
      Joi.valid(null),
    )
    .optional(),
  allowComments: Joi.boolean().default(true),
});

const updatePostSchema = Joi.object({
  body: Joi.string().trim().max(2000).allow('', null).optional(),
  linkedJobId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().allow(''),
      Joi.valid(null),
    )
    .optional(),
  allowComments: Joi.boolean().optional(),
  removeImage: Joi.boolean().optional(),
  removeMedia: Joi.boolean().optional(),
});

const videoMediaSchema = Joi.object({
  fileName: Joi.string().trim().max(255).required(),
  contentType: Joi.string().trim().max(100).required(),
  fileSizeBytes: Joi.number()
    .integer()
    .positive()
    .max(POST_VIDEO_MAX_BYTES)
    .optional(),
  durationSeconds: Joi.number().positive().optional(),
}).required();

const createVideoPostSchema = Joi.object({
  ...publisherFields,
  body: Joi.string().trim().max(2000).allow('', null).optional(),
  linkedJobId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().allow(''),
      Joi.valid(null),
    )
    .optional(),
  allowComments: Joi.boolean().default(true),
  media: videoMediaSchema,
});

const replaceVideoSchema = Joi.object({ media: videoMediaSchema });

const completeVideoUploadSchema = Joi.object({
  uploadId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const feedQuerySchema = Joi.object({
  feed: Joi.string().valid('forYou', 'mine').default('forYou'),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(30).default(10),
  publisherType: Joi.string().valid('user', 'company').optional(),
  publisherId: Joi.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');

const postSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(30).default(20),
});

const commentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).required(),
});

const commentsQuerySchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const reportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .valid('spam', 'harassment', 'misleading', 'inappropriate', 'other')
    .required(),
  details: Joi.string().trim().max(1000).allow('', null).optional(),
});

const imageInterceptor = FileInterceptor(POST_IMAGE_FIELD, {
  limits: { fileSize: POST_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedPostImageMetadata(file.mimetype, file.originalname)) {
      callback(
        new BadRequestException(
          'Post image must be JPEG, PNG, WebP, HEIC, or HEIF',
        ) as any,
        false,
      );
      return;
    }
    callback(null, true);
  },
});

const videoInterceptor = FileInterceptor(POST_VIDEO_FILE_FIELD, {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDir = getPostVideoTmpDir();
      ensurePostVideoDirectory(uploadDir);
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const extension =
        extname(file.originalname || '').toLowerCase() || '.mp4';
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: POST_VIDEO_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (
      !isAllowedPostVideoMimeType(file.mimetype) ||
      !isAllowedPostVideoFileName(file.originalname)
    ) {
      callback(
        new BadRequestException('Use an MP4, MOV, or M4V video') as any,
        false,
      );
      return;
    }
    callback(null, true);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  getFeed(
    @Query(new JoiValidationPipe(feedQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.postsService.getFeed(query, req.user.id);
  }

  @Get('search')
  search(
    @Query(new JoiValidationPipe(postSearchQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.postsService.searchPosts(query, req.user.id);
  }

  @Post('video-uploads')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  createVideoUpload(
    @Body(new JoiValidationPipe(createVideoPostSchema)) body: any,
    @Req() req: any,
  ) {
    return this.postsService.createVideoUpload(body, req.user.id);
  }

  @Post(':id/video-uploads')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  replaceVideoUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(replaceVideoSchema)) body: any,
    @Req() req: any,
  ) {
    return this.postsService.createVideoReplacement(
      id,
      body.media,
      req.user.id,
    );
  }

  @Post(':id/video-upload')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @UseInterceptors(videoInterceptor)
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @Body('uploadId') uploadId: string,
    @UploadedFile() video: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!uploadId) throw new BadRequestException('uploadId is required');
    return this.postsService.uploadVideo(id, req.user.id, uploadId, video);
  }

  @Post(':id/complete-video-upload')
  completeVideoUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(completeVideoUploadSchema))
    body: { uploadId: string },
    @Req() req: any,
  ) {
    return this.postsService.completeVideoUpload(
      id,
      req.user.id,
      body.uploadId,
    );
  }

  @Get(':id')
  getPost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.getPost(id, req.user.id);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(imageInterceptor)
  create(
    @Body(new JoiValidationPipe(createPostSchema)) body: any,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.postsService.createPost(body, image, req.user.id);
  }

  @Patch(':id')
  @UseInterceptors(imageInterceptor)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(updatePostSchema)) body: any,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.postsService.updatePost(id, body, image, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.deletePost(id, req.user.id);
  }

  @Post(':id/like')
  like(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.like(id, req.user.id);
  }

  @Delete(':id/like')
  unlike(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.unlike(id, req.user.id);
  }

  @Post(':id/save')
  save(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.save(id, req.user.id);
  }

  @Delete(':id/save')
  unsave(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.unsave(id, req.user.id);
  }

  @Post(':id/share')
  share(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.share(id, req.user.id);
  }

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query(new JoiValidationPipe(commentsQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.postsService.getComments(
      id,
      req.user.id,
      query.cursor,
      query.limit,
    );
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(commentSchema)) body: any,
    @Req() req: any,
  ) {
    return this.postsService.addComment(id, req.user.id, body.text);
  }

  @Post(':id/report')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(reportSchema)) body: any,
    @Req() req: any,
  ) {
    return this.postsService.report(id, req.user.id, body.reason, body.details);
  }
}
