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
import { Throttle } from '@nestjs/throttler';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from 'src/common/dto/api-error.dto';
import {
  PublicAccountDeletionConfirmDto,
  PublicAccountDeletionSendOtpDto,
  BlockedAccountDeletionDto,
  ScheduledAccountDeletionDto,
} from './dto/public-account-deletion.dto';

@UseGuards(JwtAuthGuard)
@Controller('users/me/deletion')
@ApiTags('Account deletion')
@ApiBearerAuth()
export class AccountDeletionController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  sendOtp(@Req() req: any) {
    return this.deletionService.sendDeletionOtp(req.user.id);
  }

  @Post('confirm')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
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
@ApiTags('Account recovery')
export class AccountRecoveryController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
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

@Controller('public/account-deletion')
@ApiTags('Account deletion')
@ApiExtraModels(ScheduledAccountDeletionDto, BlockedAccountDeletionDto)
export class PublicAccountDeletionController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('send-otp')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Send an enumeration-safe deletion OTP challenge' })
  @ApiBody({ type: PublicAccountDeletionSendOtpDto })
  @ApiAcceptedResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  sendOtp(
    @Body(
      new JoiValidationPipe(
        Joi.object({ phone: Joi.string().trim().required() }),
      ),
    )
    body: { phone: string },
  ) {
    return this.deletionService.sendPublicDeletionOtp(body.phone);
  }

  @Post('confirm')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Confirm and schedule public account deletion' })
  @ApiBody({ type: PublicAccountDeletionConfirmDto })
  @ApiAcceptedResponse({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/ScheduledAccountDeletionDto' },
        { $ref: '#/components/schemas/BlockedAccountDeletionDto' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, unknown, expired, or consumed deletion OTP.',
    type: ApiErrorDto,
  })
  confirm(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          phone: Joi.string().trim().required(),
          otp: Joi.string().trim().required(),
        }),
      ),
    )
    body: { phone: string; otp: string },
  ) {
    return this.deletionService.confirmPublicDeletion(
      body.phone,
      body.otp,
    );
  }
}
