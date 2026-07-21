import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PagesService } from 'src/pages/pages.service';

const publisherOptionsQuerySchema = Joi.object({
  capability: Joi.string().valid('publishContent').required(),
});

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilePublisherOptionsController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('publisher-options')
  getPublisherOptions(
    @Query(new JoiValidationPipe(publisherOptionsQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.pagesService.getPublisherOptions(req.user.id, query.capability);
  }
}
