import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@ApiTags('Ratings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Rate a user via job application' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['jobApplicationId', 'stars'],
      properties: {
        jobApplicationId: { type: 'number', example: 1 },
        stars: { type: 'number', minimum: 1, maximum: 5, example: 5 },
        comment: { type: 'string', example: 'Great work!' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        jobApplicationId: Joi.number().required(),
        stars: Joi.number().integer().min(1).max(5).required(),
        comment: Joi.string().allow('').optional(),
      }),
    ),
  )
  async rate(@Body() body: any, @Req() req: any) {
    return this.ratingService.rateUser(
      req.user.id,
      body.jobApplicationId,
      body.stars,
      body.comment ?? '',
    );
  }
}
