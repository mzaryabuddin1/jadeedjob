import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  BadRequestException,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { Response } from 'express';
import { AuthSessionService, SessionDeviceInput } from './auth-session.service';
import { SocialAuthService } from './social-auth.service';
import { Throttle } from '@nestjs/throttler';
import { LegalService } from 'src/legal/legal.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterSendOtpDto } from './dto/register-send-otp.dto';
import { ApiRegistrationAcceptanceRequired } from 'src/legal/legal.decorators';

const relationIdSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/),
);

const optionalString = () => Joi.string().allow('', null).optional();
const passwordSchema = Joi.string()
  .min(6)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
  .message(
    'Password must include uppercase, lowercase, number, and special character',
  );

const getRelationId = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return undefined;

  return id;
};

const isRelationIdLike = (value: unknown) => getRelationId(value) !== undefined;
const sessionDeviceFields = {
  installationId: Joi.string().trim().max(120).optional(),
  platform: Joi.string().valid('ios', 'android', 'web', 'unknown').optional(),
  deviceName: Joi.string().trim().max(120).allow('', null).optional(),
  appVersion: Joi.string().trim().max(40).allow('', null).optional(),
  locale: Joi.string().trim().max(20).allow('', null).optional(),
};

const legalAcceptanceFields = {
  legalAcceptances: Joi.array()
    .items(
      Joi.object({
        documentType: Joi.string()
          .valid('terms', 'privacy', 'community_guidelines')
          .required(),
        version: Joi.string().trim().min(1).max(80).required(),
      }),
    )
    .max(3)
    .optional(),
  clientPlatform: Joi.string()
    .valid('ios', 'android', 'web', 'unknown')
    .optional(),
};

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly twilioService: TwilioService,
    private readonly usersService: UsersService,
    private readonly authSessionService: AuthSessionService,
    private readonly socialAuthService: SocialAuthService,
    private readonly legalService: LegalService,
  ) {}

  private deviceFrom(body: any): SessionDeviceInput {
    return {
      installationId: body.installationId,
      platform: body.platform,
      deviceName: body.deviceName,
      appVersion: body.appVersion,
    };
  }

  private async sessionResponse(
    user: any,
    session: Awaited<ReturnType<AuthSessionService['createSession']>>,
    message?: string,
  ) {
    const { userId: _userId, ...tokens } = session as any;
    const profileResponse = await this.usersService.getMyProfileResponse(
      user.id,
    );
    return {
      ...(message ? { message } : {}),
      ...tokens,
      profile: profileResponse.user,
      ...profileResponse,
    };
  }

  private async deliverOtp(phone: string, code: string, purpose: string) {
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      return;
    }

    try {
      await this.twilioService.sendSms(
        phone,
        `Your JobsLoot ${purpose} OTP is ${code}. It expires in 5 minutes.`,
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }

      console.warn('Skipping OTP SMS delivery in development', {
        purpose,
        errorCode:
          (error as { code?: string })?.code ||
          (error as Error)?.name ||
          'SMS_DELIVERY_FAILED',
      });
    }
  }

  // ────────────────────────────────────────────────
  // SEND OTP FOR REGISTRATION
  // ────────────────────────────────────────────────
  @Post('register/send-otp')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Start phone registration with optional current legal acceptances' })
  @ApiBody({ type: RegisterSendOtpDto })
  @ApiRegistrationAcceptanceRequired()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        firstName: Joi.string().required(),
        lastName: optionalString(),
        phone: Joi.string().required(),
        countryId: relationIdSchema.optional(),
        languageId: relationIdSchema.optional(),
        country: Joi.alternatives()
          .try(relationIdSchema, Joi.string().allow('', null))
          .optional(),
        language: relationIdSchema.optional(),
        password: passwordSchema.required(),

        email: Joi.string().email().optional(),
        full_name: Joi.string().optional(),
        photoUri: optionalString(),
        city: optionalString(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        ...legalAcceptanceFields,
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const existing = await this.authService.findUserByPhone(body.phone);
    if (existing) throw new BadRequestException('Phone already registered');

    const countryId = getRelationId(body.countryId ?? body.country);
    const languageId = getRelationId(body.languageId ?? body.language);

    if (!countryId) {
      throw new BadRequestException('countryId must be a valid ID');
    }

    if (!languageId) {
      throw new BadRequestException('languageId must be a valid ID');
    }

    await this.authService.validateRegistrationRelations(countryId, languageId);
    await this.legalService.validateRegistrationAcceptances(
      body.legalAcceptances,
    );

    const countryDisplay =
      typeof body.country === 'string' && !isRelationIdLike(body.country)
        ? body.country
        : undefined;

    const { salt, hash } = this.authService.hashPassword(body.password);
    const registrationData = {
      ...body,
      lastName: body.lastName || '',
      country: countryId,
      language: languageId,
      profile_photo: body.photoUri || undefined,
      contact_country: countryDisplay,
      passwordHash: hash,
      passwordSalt: salt,
    };

    delete registrationData.countryId;
    delete registrationData.languageId;
    delete registrationData.photoUri;
    delete registrationData.password;
    delete registrationData.legalAcceptances;
    delete registrationData.clientPlatform;

    const { otp } = await this.otpService.createOtp({
      purpose: 'register',
      target: body.phone,
      metadata: {
        registrationData,
        legalAcceptances: body.legalAcceptances || [],
        legalClientPlatform: body.clientPlatform || 'unknown',
      },
    });
    await this.deliverOtp(body.phone, otp, 'registration');

    return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP (REGISTER)
  // ────────────────────────────────────────────────
  @Post('register/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        otp: Joi.string().optional(),
        code: Joi.string().optional(),
        fcmToken: Joi.string().optional(),
        ...sessionDeviceFields,
      }).or('otp', 'code'),
    ),
  )
  async verifyOtp(@Body() body: any) {
    const { phone, otp, code, fcmToken = null } = body;
    const submittedOtp = otp ?? code;

    const entry = await this.otpService.verifyOtp({
      purpose: 'register',
      target: phone,
      otp: submittedOtp,
    });

    const user = (await this.authService.createOrGetUser({
      ...entry.metadata?.registrationData,
      phoneVerifiedAt: new Date(),
      isVerified: false,
    })) as any;

    await this.legalService.recordRegistrationAcceptances(
      user.id,
      entry.metadata?.legalAcceptances,
      entry.metadata?.legalClientPlatform || 'unknown',
    );

    // 👉 Save FCM token if present
    if (fcmToken) {
      await this.authService.attachFcmToken(user.id, fcmToken, {
        installationId: body.installationId,
        platform: body.platform,
        appVersion: body.appVersion,
        locale: body.locale,
      });
    }

    const session = await this.authSessionService.createSession(
      user,
      this.deviceFrom(body),
    );
    return this.sessionResponse(user, session);
  }

  // ────────────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────────────
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional(),
        ...sessionDeviceFields,
      }),
    ),
  )
  async login(
    @Body() dto: { phone: string; password: string; fcmToken?: string },
  ) {
    const user = await this.authService.validateUser(dto.phone, dto.password);

    // 🔥 attach FCM token + subscribe to filter topics (if provided)
    if (dto.fcmToken) {
      await this.authService.attachFcmToken(user.id, dto.fcmToken, {
        installationId: (dto as any).installationId,
        platform: (dto as any).platform,
        appVersion: (dto as any).appVersion,
        locale: (dto as any).locale,
      });
    }

    const session = await this.authSessionService.createSession(
      user,
      this.deviceFrom(dto),
    );
    return this.sessionResponse(user, session);
  }

  // ────────────────────────────────────────────────
  // SEND OTP FOR FORGOT PASSWORD
  // ────────────────────────────────────────────────
  @Post('forgot-password/send-otp')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
      }),
    ),
  )
  async sendForgotPasswordOtp(@Body() body: any) {
    const user = await this.authService.findUserByPhone(body.phone);
    if (!user) throw new BadRequestException('Phone not registered');

    const { otp } = await this.otpService.createOtp({
      purpose: 'forgot-password',
      target: body.phone,
      metadata: {
        phone: body.phone,
      },
    });
    await this.deliverOtp(body.phone, otp, 'forgot password');

    return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP & RESET PASSWORD
  // ────────────────────────────────────────────────
  @Post('forgot-password/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        code: Joi.string().optional(),
        otp: Joi.string().optional(),
        newPassword: passwordSchema.required(),
      }).or('code', 'otp'),
    ),
  )
  async verifyForgotPasswordOtp(@Body() body: any) {
    const { phone, code, otp, newPassword } = body;
    const submittedOtp = otp ?? code;

    await this.otpService.verifyOtp({
      purpose: 'forgot-password',
      target: phone,
      otp: submittedOtp,
    });

    const user = await this.authService.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');

    const { salt, hash } = this.authService.hashPassword(newPassword);
    const updated = await this.authService.resetPassword(phone, salt, hash);
    await this.authSessionService.revokeAllForUser(
      updated.id,
      'password_reset',
    );

    return { message: 'Password reset successfully' };
  }

  @Post('phone-change/send-otp')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
        newPhone: Joi.string().required(),
      }),
    ),
  )
  async sendPhoneChangeOtp(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    const user = await this.authService.validateUserByIdAndPassword(
      userId,
      body.currentPassword,
    );

    if (user.phone === body.newPhone) {
      throw new BadRequestException('New phone must be different');
    }

    const existing = await this.authService.findUserByPhone(body.newPhone);
    if (existing) throw new BadRequestException('Phone already registered');

    const { otp } = await this.otpService.createOtp({
      purpose: 'phone-change',
      target: body.newPhone,
      userId,
      metadata: {
        newPhone: body.newPhone,
      },
    });
    await this.deliverOtp(body.newPhone, otp, 'phone change');

    return this.otpService.otpResponse(`OTP sent to ${body.newPhone}`, otp);
  }

  @Post('phone-change/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
        newPhone: Joi.string().required(),
        otp: Joi.string().required(),
        ...sessionDeviceFields,
      }),
    ),
  )
  async verifyPhoneChangeOtp(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    await this.authService.validateUserByIdAndPassword(
      userId,
      body.currentPassword,
    );

    await this.otpService.verifyOtp({
      purpose: 'phone-change',
      target: body.newPhone,
      userId,
      otp: body.otp,
    });

    const user = await this.authService.changePhone(userId, body.newPhone);
    const profile = await this.usersService.getMyProfileResponse(user.id);

    return {
      message: 'Phone updated successfully',
      ...profile,
    };
  }

  @Post('password-change/send-otp')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
      }),
    ),
  )
  async sendPasswordChangeOtp(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    const user = await this.authService.validateUserByIdAndPassword(
      userId,
      body.currentPassword,
    );

    if (!user.phoneVerifiedAt) {
      throw new BadRequestException('Phone must be verified first');
    }

    const { otp } = await this.otpService.createOtp({
      purpose: 'password-change',
      target: user.phone,
      userId,
    });
    await this.deliverOtp(user.phone, otp, 'password change');

    return this.otpService.otpResponse(`OTP sent to ${user.phone}`, otp);
  }

  @Post('password-change/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: passwordSchema.required(),
        otp: Joi.string().required(),
        ...sessionDeviceFields,
      }),
    ),
  )
  async verifyPasswordChangeOtp(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    const user = await this.authService.validateUserByIdAndPassword(
      userId,
      body.currentPassword,
    );

    await this.otpService.verifyOtp({
      purpose: 'password-change',
      target: user.phone,
      userId,
      otp: body.otp,
    });

    const updatedUser = await this.authService.changePassword(
      userId,
      body.newPassword,
    );
    await this.authSessionService.revokeAllForUser(
      updatedUser.id,
      'password_changed',
    );
    const session = await this.authSessionService.createSession(
      updatedUser,
      this.deviceFrom(body),
    );
    return this.sessionResponse(
      updatedUser,
      session,
      'Password changed successfully',
    );
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        refreshToken: Joi.string().required(),
      }),
    ),
  )
  async refresh(@Body() body: any) {
    const session = await this.authSessionService.refresh(body.refreshToken);
    const user = await this.authService.findUserById((session as any).userId);
    return this.sessionResponse(user, session as any);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    await this.authSessionService.revokeSession(
      (req.user as any)?.sid,
      'logout',
    );
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    await this.authService.incrementTokenVersion(userId);
    await this.authSessionService.revokeAllForUser(userId, 'logout_all');
    return { message: 'Logged out from all devices successfully' };
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async google(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          idToken: Joi.string().required(),
          fcmToken: Joi.string().optional(),
          ...sessionDeviceFields,
        }),
      ),
    )
    body: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const providerProfile = await this.socialAuthService.verifyGoogle(
      body.idToken,
    );
    return this.finishSocialLogin(providerProfile, body, response);
  }

  @Post('facebook')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async facebook(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          accessToken: Joi.string().required(),
          fcmToken: Joi.string().optional(),
          ...sessionDeviceFields,
        }),
      ),
    )
    body: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const providerProfile = await this.socialAuthService.verifyFacebook(
      body.accessToken,
    );
    return this.finishSocialLogin(providerProfile, body, response);
  }

  @Post('social/phone/send-otp')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  async sendSocialPhoneOtp(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          socialVerificationToken: Joi.string().required(),
          phone: Joi.string().required(),
        }),
      ),
    )
    body: any,
  ) {
    const challenge = await this.socialAuthService.verifyPhoneChallenge(
      body.socialVerificationToken,
    );
    const { otp } = await this.otpService.createOtp({
      purpose: 'social-phone',
      target: body.phone,
      metadata: {
        challengeJti: challenge.jti,
      },
    });
    await this.deliverOtp(body.phone, otp, 'social sign-in');
    return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
  }

  @Post('social/phone/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  async verifySocialPhoneOtp(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          socialVerificationToken: Joi.string().required(),
          phone: Joi.string().required(),
          otp: Joi.string().required(),
          fcmToken: Joi.string().optional(),
          ...sessionDeviceFields,
        }),
      ),
    )
    body: any,
  ) {
    const challenge = await this.socialAuthService.verifyPhoneChallenge(
      body.socialVerificationToken,
    );
    const otpRecord = await this.otpService.verifyOtp({
      purpose: 'social-phone',
      target: body.phone,
      otp: body.otp,
    });
    if (otpRecord.metadata?.challengeJti !== challenge.jti) {
      throw new UnauthorizedException('OTP does not match this social login');
    }
    const consumedChallenge =
      await this.socialAuthService.consumePhoneChallenge(
        body.socialVerificationToken,
      );
    const user = await this.socialAuthService.linkVerifiedPhone(
      consumedChallenge,
      body.phone,
    );
    if (body.fcmToken) {
      await this.authService.attachFcmToken(user.id, body.fcmToken, {
        installationId: body.installationId,
        platform: body.platform,
        appVersion: body.appVersion,
        locale: body.locale,
      });
    }
    const session = await this.authSessionService.createSession(
      user,
      this.deviceFrom(body),
    );
    return this.sessionResponse(user, session);
  }

  private async finishSocialLogin(
    providerProfile: any,
    body: any,
    response: Response,
  ) {
    const user = await this.socialAuthService.findLinkedUser(providerProfile);
    if (!user) {
      response.status(202);
      return await this.socialAuthService.createPhoneChallenge(providerProfile);
    }
    if (body.fcmToken) {
      await this.authService.attachFcmToken(user.id, body.fcmToken, {
        installationId: body.installationId,
        platform: body.platform,
        appVersion: body.appVersion,
        locale: body.locale,
      });
    }
    const session = await this.authSessionService.createSession(
      user,
      this.deviceFrom(body),
    );
    return this.sessionResponse(user, session);
  }
}
