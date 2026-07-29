import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ProfilesService } from './profiles.service';
import { ModerationService } from 'src/moderation/moderation.service';

const profileSearchQuerySchema = Joi.object({
  profileType: Joi.string().valid('user', 'company').required(),
  q: Joi.string().trim().min(2).max(80).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(30).default(20),
});

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly moderationService: ModerationService,
  ) {}

  @Get('search')
  searchProfiles(
    @Query(new JoiValidationPipe(profileSearchQuerySchema)) query: any,
    @Req() req: any,
  ) {
    return this.profilesService.searchProfiles(query, req.user.id);
  }

  @Get('blocked')
  getBlocked(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.moderationService.listBlocked(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @Post(':profileType/:profileId/block')
  block(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.moderationService.block(req.user.id, profileType, profileId);
  }

  @Delete(':profileType/:profileId/block')
  unblock(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.moderationService.unblock(req.user.id, profileType, profileId);
  }

  @Get(':profileType/:profileId')
  getProfile(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.profilesService.getProfile(profileType, profileId, req.user.id);
  }

  @Post(':profileType/:profileId/follow')
  follow(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.profilesService.follow(profileType, profileId, req.user.id);
  }

  @Delete(':profileType/:profileId/follow')
  unfollow(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return this.profilesService.unfollow(profileType, profileId, req.user.id);
  }
}
