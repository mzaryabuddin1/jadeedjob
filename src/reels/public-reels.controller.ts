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
  projectPublicReel,
} from 'src/common/public-content-projection';
import { ReelsService } from './reels.service';

const feedSchema = Joi.object({
  category: Joi.string().valid('community', 'jobs', 'social').optional(),
  cursor: Joi.string().max(512).optional(),
  limit: Joi.number().integer().min(1).max(20).default(12),
  publisherType: Joi.string().valid('user', 'company').optional(),
  publisherId: Joi.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');

const commentsSchema = Joi.object({
  cursor: Joi.string().max(512).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

@Controller('public/reels')
@UseGuards(OptionalJwtAuthGuard)
@ApiTags('Public Videos')
export class PublicReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get()
  async getFeed(
    @Query(new JoiValidationPipe(feedSchema)) query: any,
    @Req() req: any,
  ) {
    const result = await this.reelsService.getFeed(
      { ...query, feed: 'forYou' },
      req.user?.id || 0,
    );
    return {
      data: result.data.map(projectPublicReel),
      nextCursor: result.nextCursor,
    };
  }

  @Get(':id/comments')
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query(new JoiValidationPipe(commentsSchema)) query: any,
    @Req() req: any,
  ) {
    const result = await this.reelsService.getComments(
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
  async getReel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return projectPublicReel(
      await this.reelsService.getPublicReel(id, req.user?.id || 0),
    );
  }
}
