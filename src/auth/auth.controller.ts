import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly twilioService: TwilioService,
    private readonly usersService: UsersService,
  ) {}

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

      console.warn(`Skipping OTP SMS delivery in dev: ${(error as Error).message}`);
    }
  }

  // ────────────────────────────────────────────────
  // SEND OTP FOR REGISTRATION
  // ────────────────────────────────────────────────
  @Post('register/send-otp')
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

    const { otp } = await this.otpService.createOtp({
      purpose: 'register',
      target: body.phone,
      metadata: {
        registrationData,
      },
    });
    await this.deliverOtp(body.phone, otp, 'registration');

    return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP (REGISTER)
  // ────────────────────────────────────────────────
  @Post('register/verify-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        otp: Joi.string().optional(),
        code: Joi.string().optional(),
        fcmToken: Joi.string().optional(),
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

    // 👉 Save FCM token if present
    if (fcmToken) {
      await this.authService.attachFcmToken(user.id, fcmToken);
    }

    const token = this.authService.generateToken(user);
    const profile = await this.usersService.getMyProfileResponse(user.id);

    return {
      access_token: token,
      ...profile,
    };
  }

  // ────────────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────────────
  @Post('login')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional(),
      }),
    ),
  )
  async login(
    @Body() dto: { phone: string; password: string; fcmToken?: string },
  ) {
    const user = await this.authService.validateUser(dto.phone, dto.password);

    // 🔥 attach FCM token + subscribe to filter topics (if provided)
    if (dto.fcmToken) {
      await this.authService.attachFcmToken(user.id, dto.fcmToken);
    }

    const token = this.authService.generateToken(user);
    const profile = await this.usersService.getMyProfileResponse(user.id);

    return {
      access_token: token,
      ...profile,
    };
  }

  // ────────────────────────────────────────────────
  // SEND OTP FOR FORGOT PASSWORD
  // ────────────────────────────────────────────────
  @Post('forgot-password/send-otp')
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
    await this.authService.resetPassword(phone, salt, hash);

    return { message: 'Password reset successfully' };
  }

  @Post('phone-change/send-otp')
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
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
        newPhone: Joi.string().required(),
        otp: Joi.string().required(),
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
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: passwordSchema.required(),
        otp: Joi.string().required(),
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
    const token = this.authService.generateToken(updatedUser);
    const profile = await this.usersService.getMyProfileResponse(updatedUser.id);

    return {
      message: 'Password changed successfully',
      access_token: token,
      ...profile,
    };
  }
}
