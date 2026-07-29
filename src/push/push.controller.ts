import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PushService } from './push.service';

const deviceSchema = Joi.object({
  installationId: Joi.string().trim().max(120).required(),
  token: Joi.string().trim().max(512).required(),
  platform: Joi.string().valid('ios', 'android').required(),
  appVersion: Joi.string().trim().max(40).allow('', null).optional(),
  locale: Joi.string().trim().max(20).allow('', null).optional(),
});

const preferencesSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  jobs: Joi.boolean().optional(),
  applications: Joi.boolean().optional(),
  messages: Joi.boolean().optional(),
  community: Joi.boolean().optional(),
  videos: Joi.boolean().optional(),
  company: Joi.boolean().optional(),
  support: Joi.boolean().optional(),
}).min(1);

const devicePatchSchema = Joi.object({
  token: Joi.string().trim().max(512).optional(),
  platform: Joi.string().valid('ios', 'android').optional(),
  appVersion: Joi.string().trim().max(40).allow('', null).optional(),
  locale: Joi.string().trim().max(20).allow('', null).optional(),
}).min(1);

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('push-devices')
  list(@Req() req: any) {
    return this.pushService.listDevices(req.user.id);
  }

  @Post('push-devices')
  register(
    @Req() req: any,
    @Body(new JoiValidationPipe(deviceSchema)) body: any,
  ) {
    return this.pushService.upsertDevice(req.user.id, body);
  }

  @Patch('push-devices/:installationId')
  update(
    @Req() req: any,
    @Param('installationId') installationId: string,
    @Body(new JoiValidationPipe(devicePatchSchema))
    body: any,
  ) {
    return this.pushService.updateDevice(req.user.id, installationId, body);
  }

  @Delete('push-devices/:installationId')
  remove(
    @Req() req: any,
    @Param('installationId') installationId: string,
  ) {
    return this.pushService.removeDevice(req.user.id, installationId);
  }

  @Get('notification-preferences')
  getPreferences(@Req() req: any) {
    return this.pushService.getPreferences(req.user.id);
  }

  @Patch('notification-preferences')
  updatePreferences(
    @Req() req: any,
    @Body(new JoiValidationPipe(preferencesSchema)) body: any,
  ) {
    return this.pushService.updatePreferences(req.user.id, body);
  }
}
