import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
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
