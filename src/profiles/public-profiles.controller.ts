import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { projectPublicProfile } from 'src/common/public-content-projection';
import { ProfilesService } from './profiles.service';

@Controller('public/profiles')
@UseGuards(OptionalJwtAuthGuard)
@ApiTags('Public profiles')
export class PublicProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':profileType/:profileId')
  async getProfile(
    @Param('profileType') profileType: string,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Req() req: any,
  ) {
    return projectPublicProfile(
      await this.profilesService.getProfile(
        profileType,
        profileId,
        req.user?.id || 0,
      ),
    );
  }
}
