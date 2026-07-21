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
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import {
  isAllowedPostImageMetadata,
  POST_IMAGE_FIELD,
  POST_IMAGE_MAX_BYTES,
} from './post-storage.service';
import { PostsService } from './posts.service';

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
    .try(Joi.number().integer().positive(), Joi.string().allow(''))
    .optional(),
  allowComments: Joi.boolean().default(true),
});

const updatePostSchema = Joi.object({
  body: Joi.string().trim().max(2000).allow('', null).optional(),
  linkedJobId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().allow(''))
    .optional(),
  allowComments: Joi.boolean().optional(),
  removeImage: Joi.boolean().optional(),
});

const feedQuerySchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(30).default(10),
  publisherType: Joi.string().valid('user', 'company').optional(),
  publisherId: Joi.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');

const commentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).required(),
});

const reportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .valid('spam', 'harassment', 'misleading', 'inappropriate', 'other')
    .default('other'),
  details: Joi.string().trim().max(1000).allow('', null).optional(),
});

const imageInterceptor = FileInterceptor(POST_IMAGE_FIELD, {
  limits: { fileSize: POST_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedPostImageMetadata(file.mimetype, file.originalname)) {
      callback(
        new BadRequestException(
          'Post image must be JPEG, PNG, WebP, or HEIC',
        ) as any,
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
  @UsePipes(new JoiValidationPipe(feedQuerySchema))
  getFeed(@Query() query: any, @Req() req: any) {
    return this.postsService.getFeed(query, req.user.id);
  }

  @Get(':id')
  getPost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.postsService.getPost(id, req.user.id);
  }

  @Post()
  @UseInterceptors(imageInterceptor)
  @UsePipes(new JoiValidationPipe(createPostSchema))
  create(
    @Body() body: any,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.postsService.createPost(body, image, req.user.id);
  }

  @Patch(':id')
  @UseInterceptors(imageInterceptor)
  @UsePipes(new JoiValidationPipe(updatePostSchema))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
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
    @Query('cursor') cursor: string,
    @Query('limit') limit: number,
    @Req() req: any,
  ) {
    return this.postsService.getComments(
      id,
      req.user.id,
      cursor,
      Number(limit),
    );
  }

  @Post(':id/comments')
  @UsePipes(new JoiValidationPipe(commentSchema))
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
    @Req() req: any,
  ) {
    return this.postsService.addComment(id, req.user.id, text);
  }

  @Post(':id/report')
  @UsePipes(new JoiValidationPipe(reportSchema))
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.postsService.report(
      id,
      req.user.id,
      body.reason,
      body.details,
    );
  }
}
