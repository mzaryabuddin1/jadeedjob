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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const work_experience_entity_1 = require("./entities/work-experience.entity");
const education_entity_1 = require("./entities/education.entity");
const certification_entity_1 = require("./entities/certification.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const filter_entity_1 = require("../filter/entities/filter.entity");
const filter_icon_util_1 = require("../filter/filter-icon.util");
const country_entity_1 = require("../country/entities/country.entity");
const language_entity_1 = require("../language/entities/language.entity");
const profile_verification_util_1 = require("./profile-verification.util");
const referral_code_util_1 = require("./referral-code.util");
let UsersService = class UsersService {
    constructor(userRepo, filterRepo, firebaseService) {
        this.userRepo = userRepo;
        this.filterRepo = filterRepo;
        this.firebaseService = firebaseService;
    }
    normalizeFilterPreferenceIds(preferences) {
        if (!Array.isArray(preferences))
            return [];
        const ids = preferences
            .map((preference) => Number(preference))
            .filter((preference) => Number.isInteger(preference) && preference > 0);
        return Array.from(new Set(ids));
    }
    hasInvalidFilterPreferenceIds(preferences) {
        return preferences.some((preference) => {
            const id = Number(preference);
            return !Number.isInteger(id) || id <= 0;
        });
    }
    async findFiltersInPreferenceOrder(preferenceIds) {
        if (!preferenceIds.length)
            return [];
        const filters = await this.filterRepo.find({
            where: { id: (0, typeorm_2.In)(preferenceIds) },
        });
        const filtersById = new Map(filters.map((filter) => [filter.id, filter]));
        return preferenceIds
            .map((id) => filtersById.get(id))
            .filter((filter) => Boolean(filter))
            .map((filter) => (0, filter_icon_util_1.withFilterIconMeta)(filter));
    }
    toPublicUser(user) {
        const publicUser = { ...user };
        for (const field of [
            'passwordHash',
            'passwordSalt',
            'fcmTokens',
            'password',
            'admin_notes',
            'verified_by_admin_id',
            'systemRole',
        ]) {
            delete publicUser[field];
        }
        return publicUser;
    }
    async generateUniqueReferralCode(repo = this.userRepo) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const referralCode = (0, referral_code_util_1.generateReferralCode)();
            const existing = await repo.findOne({
                where: { referralCode },
                select: ['id'],
            });
            if (!existing)
                return referralCode;
        }
        throw new common_1.BadRequestException('Unable to generate referral code');
    }
    async normalizeProfileSystemFields(user, repo = this.userRepo) {
        let changed = false;
        if (!user.referralCode) {
            user.referralCode = await this.generateUniqueReferralCode(repo);
            changed = true;
        }
        if (user.isVerified && !user.phoneVerifiedAt) {
            user.phoneVerifiedAt = new Date();
            changed = true;
        }
        const nextVerified = (0, profile_verification_util_1.computeUserIsVerified)(user);
        if (user.isVerified !== nextVerified) {
            user.isVerified = nextVerified;
            changed = true;
        }
        if (changed) {
            return repo.save(user);
        }
        return user;
    }
    buildProfileResponse(user) {
        return {
            user: this.toPublicUser(user),
            verificationRequirements: (0, profile_verification_util_1.buildVerificationRequirements)(user),
        };
    }
    normalizeNullableDates(data, fields) {
        for (const field of fields) {
            if (data[field] === '') {
                data[field] = null;
            }
        }
    }
    relationIdFromValue(field, value) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) {
            throw new common_1.BadRequestException(`${field} must be a valid ID`);
        }
        return id;
    }
    async getUserById(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async getPublicUserById(id) {
        let user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        user = await this.normalizeProfileSystemFields(user);
        return this.toPublicUser(user);
    }
    async getMyProfileResponse(id) {
        let user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        user = await this.normalizeProfileSystemFields(user);
        return this.buildProfileResponse(user);
    }
    async updateUser(id, data) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        Object.assign(user, data);
        return this.userRepo.save(user);
    }
    async updateMyProfile(id, data) {
        const updatedUser = await this.userRepo.manager.transaction(async (manager) => {
            const userRepo = manager.getRepository(user_entity_1.User);
            const countryRepo = manager.getRepository(country_entity_1.Country);
            const languageRepo = manager.getRepository(language_entity_1.Language);
            const workExperienceRepo = manager.getRepository(work_experience_entity_1.WorkExperience);
            const educationRepo = manager.getRepository(education_entity_1.Education);
            const certificationRepo = manager.getRepository(certification_entity_1.Certification);
            const user = await userRepo.findOne({
                where: { id },
                relations: ['country', 'language'],
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const updateData = { ...data };
            const workExperience = updateData.work_experience;
            const education = updateData.education;
            const certifications = updateData.certifications;
            delete updateData.work_experience;
            delete updateData.education;
            delete updateData.certifications;
            const countryId = this.relationIdFromValue('country', updateData.countryId ?? updateData.country);
            if (countryId !== undefined) {
                const country = await countryRepo.findOne({
                    where: { id: countryId },
                });
                if (!country)
                    throw new common_1.BadRequestException('Country not found');
                user.country = country;
            }
            delete updateData.country;
            delete updateData.countryId;
            const languageId = this.relationIdFromValue('language', updateData.languageId ?? updateData.language);
            if (languageId !== undefined) {
                const language = await languageRepo.findOne({
                    where: { id: languageId },
                });
                if (!language)
                    throw new common_1.BadRequestException('Language not found');
                user.language = language;
            }
            delete updateData.language;
            delete updateData.languageId;
            this.normalizeNullableDates(updateData, [
                'date_of_birth',
                'id_expiry_date',
                'verification_date',
            ]);
            const documentFields = [
                'id_document_front',
                'id_document_back',
                'address_proof_document',
            ];
            const documentsChanged = documentFields.some((field) => Object.prototype.hasOwnProperty.call(updateData, field) &&
                updateData[field] !== user[field]);
            Object.assign(user, updateData);
            if (documentsChanged) {
                user.kyc_status = 'pending';
                user.verification_date = null;
                user.verified_by_admin_id = null;
                user.rejection_reason = null;
            }
            user.isVerified = (0, profile_verification_util_1.computeUserIsVerified)(user);
            const savedUser = await userRepo.save(user);
            if (Array.isArray(workExperience)) {
                await workExperienceRepo
                    .createQueryBuilder()
                    .delete()
                    .from(work_experience_entity_1.WorkExperience)
                    .where('userId = :userId', { userId: id })
                    .execute();
                const workExperienceRows = workExperience.map((item) => {
                    const row = { ...item };
                    delete row.id;
                    this.normalizeNullableDates(row, ['from_date', 'to_date']);
                    return {
                        ...row,
                        user: savedUser,
                    };
                });
                if (workExperienceRows.length) {
                    await workExperienceRepo.save(workExperienceRows);
                }
            }
            if (Array.isArray(education)) {
                await educationRepo
                    .createQueryBuilder()
                    .delete()
                    .from(education_entity_1.Education)
                    .where('userId = :userId', { userId: id })
                    .execute();
                const educationRows = education.map((item) => {
                    const row = { ...item };
                    delete row.id;
                    return {
                        ...row,
                        user: savedUser,
                    };
                });
                if (educationRows.length) {
                    await educationRepo.save(educationRows);
                }
            }
            if (Array.isArray(certifications)) {
                await certificationRepo
                    .createQueryBuilder()
                    .delete()
                    .from(certification_entity_1.Certification)
                    .where('userId = :userId', { userId: id })
                    .execute();
                const certificationRows = certifications.map((item) => {
                    const row = { ...item };
                    delete row.id;
                    this.normalizeNullableDates(row, ['certification_date']);
                    return {
                        ...row,
                        user: savedUser,
                    };
                });
                if (certificationRows.length) {
                    await certificationRepo.save(certificationRows);
                }
            }
            return userRepo.findOne({
                where: { id },
                relations: ['country', 'language'],
            });
        });
        if (!updatedUser)
            throw new common_1.NotFoundException('User not found');
        return this.toPublicUser(await this.normalizeProfileSystemFields(updatedUser));
    }
    async updateProfileDocument(userId, type, fileUrl) {
        const fieldByType = {
            id_front: 'id_document_front',
            id_back: 'id_document_back',
            address_proof: 'address_proof_document',
            profile_photo: 'profile_photo',
        };
        const field = fieldByType[type];
        if (!field)
            throw new common_1.BadRequestException('Invalid document type');
        await this.updateMyProfile(userId, {
            [field]: fileUrl,
        });
        return this.getMyProfileResponse(userId);
    }
    async findUsersByIds(ids) {
        return this.userRepo.find({
            where: { id: (0, typeorm_2.In)(ids) },
        });
    }
    async getUserPreference(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'filter_preferences'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user session');
        }
        const preferenceIds = this.normalizeFilterPreferenceIds(user.filter_preferences);
        const filters = await this.findFiltersInPreferenceOrder(preferenceIds);
        return { data: preferenceIds, filters };
    }
    async updateUserFilterPreferences(userId, newFilters) {
        if (this.hasInvalidFilterPreferenceIds(newFilters)) {
            throw new common_1.BadRequestException('Filter preferences must be valid IDs');
        }
        const newFilterIds = this.normalizeFilterPreferenceIds(newFilters);
        const existingFilters = newFilterIds.length
            ? await this.filterRepo.find({
                where: { id: (0, typeorm_2.In)(newFilterIds) },
                select: ['id'],
            })
            : [];
        if (existingFilters.length !== newFilterIds.length) {
            throw new common_1.BadRequestException('One or more filter preferences are invalid');
        }
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'filter_preferences', 'fcmTokens'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user session');
        }
        const oldFilters = this.normalizeFilterPreferenceIds(user.filter_preferences);
        user.filter_preferences = newFilterIds;
        await this.userRepo.save(user);
        for (const token of user.fcmTokens || []) {
            await this.firebaseService.updateFilterSubscriptions(token, oldFilters, newFilterIds);
        }
        return newFilterIds;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map