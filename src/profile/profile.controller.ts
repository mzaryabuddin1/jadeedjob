import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { LANGUAGE_LEVELS } from 'src/users/entities/user-language.entity';
import { ProfileService } from './profile.service';

const str = (max: number) => Joi.string().trim().max(max);
const url = () => Joi.string().trim().uri().max(500);
const year = () =>
  Joi.string()
    .pattern(/^\d{4}$/)
    .messages({ 'string.pattern.base': 'must be a 4-digit year' });

const profileSchema = Joi.object({
  headline: str(220).allow(''),
  about: Joi.string().trim().max(3000).allow(''),
  profile_photo: url().allow(''),
  cover_photo: url().allow(''),
  full_name: str(150),
  city: str(100),
  state: str(100),
  contact_country: str(100),
  skills: Joi.array().items(str(50)).max(50),
  technical_skills: Joi.array().items(str(50)).max(50),
  soft_skills: Joi.array().items(str(50)).max(50),
  linkedin_url: url().allow(''),
  github_url: url().allow(''),
  portfolio_url: url().allow(''),
  behance_url: url().allow(''),
  facebook_url: url().allow(''),
  instagram_url: url().allow(''),
  twitter_url: url().allow(''),
  youtube_url: url().allow(''),
  open_to_work: Joi.boolean(),
}).min(1);

const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'temporary',
  'freelance',
  'internship',
  'self-employed',
];

const experienceFields = {
  company_name: str(150),
  pageId: Joi.number().integer().positive().allow(null),
  designation: str(150),
  department: str(100),
  employment_type: Joi.string().valid(...EMPLOYMENT_TYPES),
  location: str(150),
  from_date: Joi.date(),
  to_date: Joi.date().allow(null),
  currently_working: Joi.boolean(),
  key_responsibilities: Joi.string().trim().max(3000),
  experience_certificate: url(),
};
const experienceCreate = Joi.object({
  ...experienceFields,
  designation: str(150).required(),
  from_date: Joi.date().required(),
});
const experienceUpdate = Joi.object(experienceFields).min(1);

const educationFields = {
  institution_name: str(200),
  highest_qualification: str(150),
  field_of_study: str(150),
  start_year: year(),
  graduation_year: Joi.string().trim().max(10),
  gpa_or_grade: str(30),
  description: Joi.string().trim().max(2000),
  degree_document: url(),
};
const educationCreate = Joi.object({
  ...educationFields,
  institution_name: str(200).required(),
});
const educationUpdate = Joi.object(educationFields).min(1);

const certificationFields = {
  certification_name: str(200),
  issuing_institution: str(200),
  certification_date: Joi.date(),
  expiry_date: Joi.date().allow(null),
  credential_id: str(100),
  credential_url: url(),
  certificate_file: url(),
};
const certificationCreate = Joi.object({
  ...certificationFields,
  certification_name: str(200).required(),
});
const certificationUpdate = Joi.object(certificationFields).min(1);

const languageName = () => Joi.string().trim().min(2).max(60);
const languageLevel = () => Joi.string().valid(...LANGUAGE_LEVELS);
const languageCreate = Joi.object({
  language_name: languageName().required(),
  proficiency: languageLevel().required(),
});
const languageUpdate = Joi.object({
  language_name: languageName(),
  proficiency: languageLevel(),
}).min(1);

const body = (schema: Joi.ObjectSchema) => Body(new JoiValidationPipe(schema));

/** LinkedIn-style profile: headline, about, skills, experience, education, certifications, languages, links */
@ApiTags('Profile')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller('users')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  // static `me/...` routes first so `:userId` never swallows them

  @Get('me/profile')
  @ApiOperation({
    summary: 'My full profile',
    description:
      'Same shape other people see, plus a `private` block (email, phone, DOB, address) and my document links.',
  })
  myProfile(@Req() req: any) {
    return this.profile.getProfile(req.user.id, req.user.id);
  }

  @Patch('me/profile')
  @ApiOperation({
    summary: 'Edit my profile',
    description:
      'headline, about, photos, location, skills (`technical_skills` = Professional skills, `soft_skills` = People skills, `skills` = general list), links (`portfolio_url` = website / portfolio, plus linkedin, github, behance, facebook, instagram, twitter, youtube), open_to_work. Experience / education / certifications / languages have their own endpoints below. Email/phone/username have their own flows.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          example: 'Warehouse supervisor | 6 years experience',
        },
        about: { type: 'string', example: 'I manage inbound logistics...' },
        profile_photo: { type: 'string', example: 'https://.../me.jpg' },
        cover_photo: { type: 'string', example: 'https://.../cover.jpg' },
        full_name: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        contact_country: { type: 'string' },
        skills: {
          type: 'array',
          items: { type: 'string' },
          example: ['Forklift', 'Inventory'],
        },
        technical_skills: { type: 'array', items: { type: 'string' } },
        soft_skills: { type: 'array', items: { type: 'string' } },
        linkedin_url: { type: 'string' },
        github_url: { type: 'string' },
        portfolio_url: { type: 'string' },
        behance_url: { type: 'string' },
        facebook_url: { type: 'string' },
        instagram_url: { type: 'string' },
        twitter_url: { type: 'string' },
        youtube_url: { type: 'string' },
        open_to_work: { type: 'boolean', example: true },
      },
    },
  })
  updateProfile(@body(profileSchema) data: any, @Req() req: any) {
    return this.profile.updateProfile(req.user.id, data);
  }

  // ── experience ──

  @Post('me/experience')
  @ApiOperation({
    summary: 'Add work experience',
    description:
      '`designation` and `from_date` required; `company_name` or a JobsLoot `pageId` (links to the page profile). `to_date` required unless `currently_working` is true.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['designation', 'from_date'],
      properties: {
        company_name: { type: 'string', example: 'Acme Traders' },
        pageId: { type: 'number', nullable: true, example: 3 },
        designation: { type: 'string', example: 'Supervisor' },
        department: { type: 'string' },
        employment_type: { type: 'string', enum: EMPLOYMENT_TYPES },
        location: { type: 'string', example: 'Karachi' },
        from_date: { type: 'string', format: 'date', example: '2020-03-01' },
        to_date: { type: 'string', format: 'date', nullable: true },
        currently_working: { type: 'boolean', example: false },
        key_responsibilities: { type: 'string' },
        experience_certificate: { type: 'string' },
      },
    },
  })
  addExperience(@body(experienceCreate) data: any, @Req() req: any) {
    return this.profile.addExperience(req.user.id, data);
  }

  @Patch('me/experience/:id')
  @ApiOperation({ summary: 'Edit an experience (send only what changes)' })
  updateExperience(
    @Param('id', ParseIntPipe) id: number,
    @body(experienceUpdate) data: any,
    @Req() req: any,
  ) {
    return this.profile.updateExperience(req.user.id, id, data);
  }

  @Delete('me/experience/:id')
  @ApiOperation({ summary: 'Remove an experience' })
  removeExperience(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.profile.removeExperience(req.user.id, id);
  }

  // ── education ──

  @Post('me/education')
  @ApiOperation({
    summary: 'Add education',
    description: '`institution_name` required.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['institution_name'],
      properties: {
        institution_name: { type: 'string', example: 'University of Karachi' },
        highest_qualification: { type: 'string', example: 'BBA' },
        field_of_study: { type: 'string', example: 'Supply chain' },
        start_year: { type: 'string', example: '2016' },
        graduation_year: { type: 'string', example: '2020' },
        gpa_or_grade: { type: 'string', example: '3.4' },
        description: { type: 'string' },
        degree_document: { type: 'string' },
      },
    },
  })
  addEducation(@body(educationCreate) data: any, @Req() req: any) {
    return this.profile.addEducation(req.user.id, data);
  }

  @Patch('me/education/:id')
  @ApiOperation({ summary: 'Edit an education entry' })
  updateEducation(
    @Param('id', ParseIntPipe) id: number,
    @body(educationUpdate) data: any,
    @Req() req: any,
  ) {
    return this.profile.updateEducation(req.user.id, id, data);
  }

  @Delete('me/education/:id')
  @ApiOperation({ summary: 'Remove an education entry' })
  removeEducation(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.profile.removeEducation(req.user.id, id);
  }

  // ── certifications ──

  @Post('me/certifications')
  @ApiOperation({
    summary: 'Add a certification',
    description: '`certification_name` required.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['certification_name'],
      properties: {
        certification_name: { type: 'string', example: 'Forklift operator' },
        issuing_institution: { type: 'string' },
        certification_date: { type: 'string', format: 'date' },
        expiry_date: { type: 'string', format: 'date', nullable: true },
        credential_id: { type: 'string' },
        credential_url: { type: 'string' },
        certificate_file: { type: 'string' },
      },
    },
  })
  addCertification(@body(certificationCreate) data: any, @Req() req: any) {
    return this.profile.addCertification(req.user.id, data);
  }

  @Patch('me/certifications/:id')
  @ApiOperation({ summary: 'Edit a certification' })
  updateCertification(
    @Param('id', ParseIntPipe) id: number,
    @body(certificationUpdate) data: any,
    @Req() req: any,
  ) {
    return this.profile.updateCertification(req.user.id, id, data);
  }

  @Delete('me/certifications/:id')
  @ApiOperation({ summary: 'Remove a certification' })
  removeCertification(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.profile.removeCertification(req.user.id, id);
  }

  // ── languages ──

  @Get('me/languages')
  @ApiOperation({
    summary: 'My languages',
    description:
      'Same list as `languages` on the profile: best spoken first. Levels: `basic`, `conversational`, `fluent`, `native`.',
  })
  myLanguages(@Req() req: any) {
    return this.profile.listMyLanguages(req.user.id);
  }

  @Post('me/languages')
  @ApiOperation({
    summary: 'Add a language',
    description:
      'Both fields required. `language_name` is free text (trimmed, first letter capital); adding the same language twice is 409 (any letter case). Up to 20 languages. This is the profile list, not the app language.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['language_name', 'proficiency'],
      properties: {
        language_name: { type: 'string', example: 'Urdu' },
        proficiency: {
          type: 'string',
          enum: [...LANGUAGE_LEVELS],
          example: 'native',
        },
      },
    },
  })
  addLanguage(@body(languageCreate) data: any, @Req() req: any) {
    return this.profile.addLanguage(req.user.id, data);
  }

  @Patch('me/languages/:id')
  @ApiOperation({ summary: 'Edit a language (name and / or level)' })
  updateLanguage(
    @Param('id', ParseIntPipe) id: number,
    @body(languageUpdate) data: any,
    @Req() req: any,
  ) {
    return this.profile.updateLanguage(req.user.id, id, data);
  }

  @Delete('me/languages/:id')
  @ApiOperation({ summary: 'Remove a language' })
  removeLanguage(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.profile.removeLanguage(req.user.id, id);
  }

  // ── someone else's profile (declared last) ──

  @Get(':userId/profile')
  @ApiOperation({
    summary: 'Public profile of a user',
    description:
      'Name, headline, about, location, links, skills, experience, education, certifications, rating, follower counts, managed pages and `viewer.isFollowing`. Never contains contact details, bank details or documents.',
  })
  userProfile(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.profile.getProfile(userId, req.user.id);
  }
}
