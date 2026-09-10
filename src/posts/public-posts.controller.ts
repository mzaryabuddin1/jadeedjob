import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import Joi from 'joi';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import {
  projectPublicComment,
  projectPublicPost,
} from 'src/common/public-content-projection';
import { PostsService } from './posts.service';

const feedSchema = Joi.object({
  cursor: Joi.string().max(512).optional(),
  limit: Joi.number().integer().min(1).max(30).default(20),
  publisherType: Joi.string().valid('user', 'company').optional(),
  publisherId: Joi.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');

const commentsSchema = Joi.object({
  cursor: Joi.string().max(512).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

@Controller('public/posts')
@UseGuards(OptionalJwtAuthGuard)
@ApiTags('Public Community posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getFeed(
    @Query(new JoiValidationPipe(feedSchema)) query: any,
    @Req() req: any,
  ) {
    const result = await this.postsService.getFeed(
      { ...query, feed: 'forYou' },
      req.user?.id || 0,
    );
    return {
      data: result.data.map(projectPublicPost),
      nextCursor: result.nextCursor,
    };
  }

  @Get(':id/comments')
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query(new JoiValidationPipe(commentsSchema)) query: any,
    @Req() req: any,
  ) {
    const result = await this.postsService.getComments(
      id,
      req.user?.id || 0,
      query.cursor,
      query.limit,
    );
    return {
      data: result.data.filter(Boolean).map(projectPublicComment),
      nextCursor: result.nextCursor,
    };
  }

  @Get(':id')
  async getPost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return projectPublicPost(
      await this.postsService.getPost(id, req.user?.id || 0),
    );
  }
}
