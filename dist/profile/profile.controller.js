"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const user_language_entity_1 = require("../users/entities/user-language.entity");
const profile_service_1 = require("./profile.service");
const str = (max) => joi_1.default.string().trim().max(max);
const url = () => joi_1.default.string().trim().uri().max(500);
const year = () => joi_1.default.string()
    .pattern(/^\d{4}$/)
    .messages({ 'string.pattern.base': 'must be a 4-digit year' });
const profileSchema = joi_1.default.object({
    headline: str(220).allow(''),
    about: joi_1.default.string().trim().max(3000).allow(''),
    profile_photo: url().allow(''),
    cover_photo: url().allow(''),
    full_name: str(150),
    city: str(100),
    state: str(100),
    contact_country: str(100),
    skills: joi_1.default.array().items(str(50)).max(50),
    technical_skills: joi_1.default.array().items(str(50)).max(50),
    soft_skills: joi_1.default.array().items(str(50)).max(50),
    linkedin_url: url().allow(''),
    github_url: url().allow(''),
    portfolio_url: url().allow(''),
    behance_url: url().allow(''),
    facebook_url: url().allow(''),
    instagram_url: url().allow(''),
    twitter_url: url().allow(''),
    youtube_url: url().allow(''),
    open_to_work: joi_1.default.boolean(),
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
    pageId: joi_1.default.number().integer().positive().allow(null),
    designation: str(150),
    department: str(100),
    employment_type: joi_1.default.string().valid(...EMPLOYMENT_TYPES),
    location: str(150),
    from_date: joi_1.default.date(),
    to_date: joi_1.default.date().allow(null),
    currently_working: joi_1.default.boolean(),
    key_responsibilities: joi_1.default.string().trim().max(3000),
    experience_certificate: url(),
};
const experienceCreate = joi_1.default.object({
    ...experienceFields,
    designation: str(150).required(),
    from_date: joi_1.default.date().required(),
});
const experienceUpdate = joi_1.default.object(experienceFields).min(1);
const educationFields = {
    institution_name: str(200),
    highest_qualification: str(150),
    field_of_study: str(150),
    start_year: year(),
    graduation_year: joi_1.default.string().trim().max(10),
    gpa_or_grade: str(30),
    description: joi_1.default.string().trim().max(2000),
    degree_document: url(),
};
const educationCreate = joi_1.default.object({
    ...educationFields,
    institution_name: str(200).required(),
});
const educationUpdate = joi_1.default.object(educationFields).min(1);
const certificationFields = {
    certification_name: str(200),
    issuing_institution: str(200),
    certification_date: joi_1.default.date(),
    expiry_date: joi_1.default.date().allow(null),
    credential_id: str(100),
    credential_url: url(),
    certificate_file: url(),
};
const certificationCreate = joi_1.default.object({
    ...certificationFields,
    certification_name: str(200).required(),
});
const certificationUpdate = joi_1.default.object(certificationFields).min(1);
const languageName = () => joi_1.default.string().trim().min(2).max(60);
const languageLevel = () => joi_1.default.string().valid(...user_language_entity_1.LANGUAGE_LEVELS);
const languageCreate = joi_1.default.object({
    language_name: languageName().required(),
    proficiency: languageLevel().required(),
});
const languageUpdate = joi_1.default.object({
    language_name: languageName(),
    proficiency: languageLevel(),
}).min(1);
const body = (schema) => (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(schema));
let ProfileController = class ProfileController {
    constructor(profile) {
        this.profile = profile;
    }
    myProfile(req) {
        return this.profile.getProfile(req.user.id, req.user.id);
    }
    updateProfile(data, req) {
        return this.profile.updateProfile(req.user.id, data);
    }
    addExperience(data, req) {
        return this.profile.addExperience(req.user.id, data);
    }
    updateExperience(id, data, req) {
        return this.profile.updateExperience(req.user.id, id, data);
    }
    removeExperience(id, req) {
        return this.profile.removeExperience(req.user.id, id);
    }
    addEducation(data, req) {
        return this.profile.addEducation(req.user.id, data);
    }
    updateEducation(id, data, req) {
        return this.profile.updateEducation(req.user.id, id, data);
    }
    removeEducation(id, req) {
        return this.profile.removeEducation(req.user.id, id);
    }
    addCertification(data, req) {
        return this.profile.addCertification(req.user.id, data);
    }
    updateCertification(id, data, req) {
        return this.profile.updateCertification(req.user.id, id, data);
    }
    removeCertification(id, req) {
        return this.profile.removeCertification(req.user.id, id);
    }
    myLanguages(req) {
        return this.profile.listMyLanguages(req.user.id);
    }
    addLanguage(data, req) {
        return this.profile.addLanguage(req.user.id, data);
    }
    updateLanguage(id, data, req) {
        return this.profile.updateLanguage(req.user.id, id, data);
    }
    removeLanguage(id, req) {
        return this.profile.removeLanguage(req.user.id, id);
    }
    userProfile(userId, req) {
        return this.profile.getProfile(userId, req.user.id);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, swagger_1.ApiOperation)({
        summary: 'My full profile',
        description: 'Same shape other people see, plus a `private` block (email, phone, DOB, address) and my document links.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "myProfile", null);
__decorate([
    (0, common_1.Patch)('me/profile'),
    (0, swagger_1.ApiOperation)({
        summary: 'Edit my profile',
        description: 'headline, about, photos, location, skills (`technical_skills` = Professional skills, `soft_skills` = People skills, `skills` = general list), links (`portfolio_url` = website / portfolio, plus linkedin, github, behance, facebook, instagram, twitter, youtube), open_to_work. Experience / education / certifications / languages have their own endpoints below. Email/phone/username have their own flows.',
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, body(profileSchema)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('me/experience'),
    (0, swagger_1.ApiOperation)({
        summary: 'Add work experience',
        description: '`designation` and `from_date` required; `company_name` or a JobsLoot `pageId` (links to the page profile). `to_date` required unless `currently_working` is true.',
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, body(experienceCreate)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "addExperience", null);
__decorate([
    (0, common_1.Patch)('me/experience/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit an experience (send only what changes)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, body(experienceUpdate)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateExperience", null);
__decorate([
    (0, common_1.Delete)('me/experience/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove an experience' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "removeExperience", null);
__decorate([
    (0, common_1.Post)('me/education'),
    (0, swagger_1.ApiOperation)({
        summary: 'Add education',
        description: '`institution_name` required.',
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, body(educationCreate)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "addEducation", null);
__decorate([
    (0, common_1.Patch)('me/education/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit an education entry' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, body(educationUpdate)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateEducation", null);
__decorate([
    (0, common_1.Delete)('me/education/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove an education entry' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "removeEducation", null);
__decorate([
    (0, common_1.Post)('me/certifications'),
    (0, swagger_1.ApiOperation)({
        summary: 'Add a certification',
        description: '`certification_name` required.',
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, body(certificationCreate)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "addCertification", null);
__decorate([
    (0, common_1.Patch)('me/certifications/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a certification' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, body(certificationUpdate)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateCertification", null);
__decorate([
    (0, common_1.Delete)('me/certifications/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a certification' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "removeCertification", null);
__decorate([
    (0, common_1.Get)('me/languages'),
    (0, swagger_1.ApiOperation)({
        summary: 'My languages',
        description: 'Same list as `languages` on the profile: best spoken first. Levels: `basic`, `conversational`, `fluent`, `native`.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "myLanguages", null);
__decorate([
    (0, common_1.Post)('me/languages'),
    (0, swagger_1.ApiOperation)({
        summary: 'Add a language',
        description: 'Both fields required. `language_name` is free text (trimmed, first letter capital); adding the same language twice is 409 (any letter case). Up to 20 languages. This is the profile list, not the app language.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['language_name', 'proficiency'],
            properties: {
                language_name: { type: 'string', example: 'Urdu' },
                proficiency: {
                    type: 'string',
                    enum: [...user_language_entity_1.LANGUAGE_LEVELS],
                    example: 'native',
                },
            },
        },
    }),
    __param(0, body(languageCreate)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "addLanguage", null);
__decorate([
    (0, common_1.Patch)('me/languages/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a language (name and / or level)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, body(languageUpdate)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateLanguage", null);
__decorate([
    (0, common_1.Delete)('me/languages/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a language' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "removeLanguage", null);
__decorate([
    (0, common_1.Get)(':userId/profile'),
    (0, swagger_1.ApiOperation)({
        summary: 'Public profile of a user',
        description: 'Name, headline, about, location, links, skills, experience, education, certifications, rating, follower counts, managed pages and `viewer.isFollowing`. Never contains contact details, bank details or documents.',
    }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "userProfile", null);
exports.ProfileController = ProfileController = __decorate([
    (0, swagger_1.ApiTags)('Profile'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map