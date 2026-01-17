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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  @Patch('me')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().optional(),
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        phone: Joi.string().optional(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .optional(),

        // 🔥 filter_preferences allowed here
        filter_preferences: Joi.array().items(Joi.number()).optional(),

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

    // Remove forbidden fields
    const forbidden = [
      'passwordHash',
      'passwordSalt',
      'isBanned',
      'isVerified',
      'verified_by_admin_id',
      'kyc_status',
      'country',
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

    // 🔥 If filter_preferences changed, update DB + Firebase topics
    if (newFilterPreferences) {
      await this.usersService.updateUserFilterPreferences(
        userId,
        newFilterPreferences,
      );
      // reflect in response
      (updatedUser as any).filter_preferences = newFilterPreferences;
    }

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  @Get('me/preferences')
  async getMyPreferences(@Req() req: any) {
    return await this.usersService.getUserPreference(req.user.id);
  }



  
}
