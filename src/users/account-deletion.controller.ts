import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { AccountDeletionService } from './account-deletion.service';

@UseGuards(JwtAuthGuard)
@Controller('users/me/deletion')
export class AccountDeletionController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('send-otp')
  sendOtp(@Req() req: any) {
    return this.deletionService.sendDeletionOtp(req.user.id);
  }

  @Post('confirm')
  @HttpCode(202)
  confirm(
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({ otp: Joi.string().trim().required() }),
      ),
    )
    body: any,
  ) {
    return this.deletionService.confirmDeletion(req.user.id, body.otp);
  }
}

@Controller('auth/account-recovery')
export class AccountRecoveryController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('send-otp')
  sendOtp(
    @Body(
      new JoiValidationPipe(
        Joi.object({ phone: Joi.string().trim().required() }),
      ),
    )
    body: any,
  ) {
    return this.deletionService.sendRecoveryOtp(body.phone);
  }

  @Post('confirm')
  confirm(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          phone: Joi.string().trim().required(),
          otp: Joi.string().trim().required(),
          installationId: Joi.string().trim().max(120).optional(),
          platform: Joi.string()
            .valid('ios', 'android', 'web', 'unknown')
            .optional(),
          deviceName: Joi.string().trim().max(120).allow('', null).optional(),
          appVersion: Joi.string().trim().max(40).allow('', null).optional(),
        }),
      ),
    )
    body: any,
  ) {
    return this.deletionService.confirmRecovery(body.phone, body.otp, body);
  }
}
