import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
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
  @ApiOperation({
    summary: 'Rate the other side of an accepted application',
    description: [
      'Only after the employer **accepted** the application, and **once per side**:',
      '- the **applicant (employee)** rates the employer side',
      '- the **employer side** (job poster, or page owner/admin/editor) rates the applicant',
      '',
      'Where the rating lands:',
      "- rating an **applicant** → the applicant's **profile rating** (`users.ratingAverage`)",
      "- employee rating a **personal job's poster** → the poster's **profile rating**",
      '- employee rating a job posted **under a page** → the **page rating** (`pages.page_rating`), not the person',
      '',
      'A profile rating is the average of ALL ratings the person received, as employee and as employer together.',
    ].join('\n'),
  })
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

  @Get('application/:applicationId')
  @ApiOperation({
    summary: 'Can I rate on this application? (rating screen state)',
    description:
      'For the applicant or the employer side of the application: `myRole` (employee/employer), who `willRate` (user or page), `canRate`, `iRated`, `otherSideRated`. 403 if you are not part of the application.',
  })
  async applicationState(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Req() req: any,
  ) {
    return this.ratingService.getApplicationRatingState(
      applicationId,
      req.user.id,
    );
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'User rating summary',
    description:
      '`average`/`count` = all ratings the person received (employee + employer roles pooled). `asEmployee` = rated by employers, `asEmployer` = rated by employees of jobs they posted personally (jobs under a page count for the page instead).',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async userSummary(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit = '10',
  ) {
    return this.ratingService.getUserSummary(userId, Number(limit) || 10);
  }

  @Get('page/:pageId')
  @ApiOperation({
    summary: 'Page rating summary',
    description:
      'Average of the ratings employees gave this page for jobs posted under it.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async pageSummary(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Query('limit') limit = '10',
  ) {
    return this.ratingService.getPageSummary(pageId, Number(limit) || 10);
  }
}
