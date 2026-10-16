import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  UsePipes,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  @Patch('me')
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Email/phone cannot be changed here — use `/auth/update-email/*` and `/auth/kyc/*`. `filter_preferences`: min **4**, max **30** unique filter ids (drives preferred-first order on `GET /filters`).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        password: {
          type: 'string',
          description:
            'Min 6; must include uppercase, lowercase, number, special char',
        },
        filter_preferences: {
          type: 'array',
          items: { type: 'number' },
          minItems: 4,
          maxItems: 30,
          uniqueItems: true,
          example: [1, 11, 15, 17],
          description: 'Preferred filter category ids (min 4, max 30)',
        },
        full_name: { type: 'string' },
        father_name: { type: 'string' },
        gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
        date_of_birth: { type: 'string', format: 'date' },
        nationality: { type: 'string' },
        marital_status: {
          type: 'string',
          enum: ['Single', 'Married', 'Other'],
        },
        profile_photo: { type: 'string', format: 'uri' },
        alternate_phone: { type: 'string' },
        address_line1: { type: 'string' },
        address_line2: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        postal_code: { type: 'string' },
        contact_country: { type: 'string' },
        professional_summary: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        technical_skills: { type: 'array', items: { type: 'string' } },
        soft_skills: { type: 'array', items: { type: 'string' } },
        linkedin_url: { type: 'string', format: 'uri' },
        github_url: { type: 'string', format: 'uri' },
        portfolio_url: { type: 'string', format: 'uri' },
        behance_url: { type: 'string', format: 'uri' },
        bank_name: { type: 'string' },
        account_number: { type: 'string' },
        iban: { type: 'string' },
        branch_name: { type: 'string' },
        swift_code: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .optional(),

        filter_preferences: Joi.array()
          .items(Joi.number().integer().positive())
          .min(4)
          .max(30)
          .unique()
          .optional()
          .messages({
            'array.min': 'Select at least 4 filter preferences',
            'array.max': 'You can select at most 30 filter preferences',
            'array.unique': 'filter_preferences must not contain duplicates',
          }),

        full_name: Joi.string().optional(),
        father_name: Joi.string().optional(),
        gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
        date_of_birth: Joi.date().optional(),
        nationality: Joi.string().optional(),
        marital_status: Joi.string()
          .valid('Single', 'Married', 'Other')
          .optional(),
        profile_photo: Joi.string().uri().optional(),

        alternate_phone: Joi.string().optional(),
        address_line1: Joi.string().optional(),
        address_line2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        contact_country: Joi.string().optional(),

        professional_summary: Joi.string().optional(),

        skills: Joi.array().items(Joi.string()).optional(),
        technical_skills: Joi.array().items(Joi.string()).optional(),
        soft_skills: Joi.array().items(Joi.string()).optional(),

        linkedin_url: Joi.string().uri().optional(),
        github_url: Joi.string().uri().optional(),
        portfolio_url: Joi.string().uri().optional(),
        behance_url: Joi.string().uri().optional(),

        bank_name: Joi.string().optional(),
        account_number: Joi.string().optional(),
        iban: Joi.string().optional(),
        branch_name: Joi.string().optional(),
        swift_code: Joi.string().optional(),

        notes: Joi.string().optional(),
      }),
    ),
  )
  async updateMe(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    if (!userId) throw new NotFoundException('User not found or unauthorized');

    // Extract filter_preferences if present
    let newFilterPreferences: number[] | undefined;
    if (Array.isArray(body.filter_preferences)) {
      newFilterPreferences = body.filter_preferences;
      delete body.filter_preferences; // avoid double handling in usersService
    }

    // Remove forbidden fields (email/phone via dedicated OTP flows)
    const forbidden = [
      'email',
      'phone',
      'passwordHash',
      'passwordSalt',
      'isBanned',
      'isVerified',
      'verified_by_admin_id',
      'kyc_status',
      'country',
      'cityEntity',
      'cityId',
      'googleId',
      'facebookId',
      'authProvider',
    ];
    forbidden.forEach((field) => delete body[field]);

    // Password update
    if (body?.password) {
      const { salt, hash } = this.authService.hashPassword(body.password);
      body.passwordHash = hash;
      body.passwordSalt = salt;
      delete body.password;
    }

    // Update normal profile fields
    const updatedUser = await this.usersService.updateUser(userId, body);

    // If filter_preferences changed, update DB + Firebase topics (min 4, max 30)
    if (newFilterPreferences) {
      const saved = await this.usersService.updateUserFilterPreferences(
        userId,
        newFilterPreferences,
      );
      (updatedUser as any).filter_preferences =
        saved?.filter_preferences ?? newFilterPreferences;
    }

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get my filter preferences' })
  async getMyPreferences(@Req() req: any) {
    return await this.usersService.getUserPreference(req.user.id);
  }

  @Get('me/notification-settings')
  @ApiOperation({
    summary: 'Get my notification settings',
    description:
      'Which channels get new-job notifications (jobs in my `filter_preferences`). Defaults: `push: true`, `email: false`.',
  })
  async getNotificationSettings(@Req() req: any) {
    return this.usersService.getNotificationSettings(req.user.id);
  }

  @Patch('me/notification-settings')
  @ApiOperation({
    summary: 'Update my notification settings',
    description: [
      'Send one or more channels; omitted channels keep their value.',
      '- `push`: Firebase push notification to my devices',
      '- `email`: email to my account email (an email must be set on the account)',
      '',
      'More channels can be added later without changing this shape.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        push: { type: 'boolean', example: true },
        email: { type: 'boolean', example: false },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        push: Joi.boolean().optional(),
        email: Joi.boolean().optional(),
      })
        .min(1)
        .messages({ 'object.min': 'Send at least one of: push, email' }),
    ),
  )
  async updateNotificationSettings(
    @Req() req: any,
    @Body() body: { push?: boolean; email?: boolean },
  ) {
    return this.usersService.updateNotificationSettings(req.user.id, body);
  }
}
