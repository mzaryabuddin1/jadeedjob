import {
  Body,
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
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCreateModerationReport } from 'src/moderation/moderation.decorators';

const profileSearchQuerySchema = Joi.object({
  profileType: Joi.string().valid('user', 'company').required(),
  q: Joi.string().trim().min(2).max(80).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(30).default(20),
});

const reportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .valid(
      'spam',
      'harassment',
      'impersonation',
      'fraud',
      'unsafe',
      'inappropriate',
      'other',
    )
    .required(),
  details: Joi.string().trim().max(1000).allow('', null).optional(),
});

const blockedPaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

@UseGuards(JwtAuthGuard)
@Controller('profiles')
@ApiTags('Profiles')
@ApiBearerAuth()
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
    @Query(new JoiValidationPipe(blockedPaginationSchema)) query: any,
  ) {
    return this.moderationService.listBlocked(
      req.user.id,
      query.page,
      query.limit,
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

  @Post(':profileType/:profileId/report')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiCreateModerationReport('Report a public user or approved company profile')
  report(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body(new JoiValidationPipe(reportSchema)) body: any,
    @Req() req: any,
  ) {
    return this.moderationService.reportProfile(
      profileType,
      profileId,
      req.user.id,
      body,
    );
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
