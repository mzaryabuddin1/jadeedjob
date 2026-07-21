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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const user_entity_1 = require("../users/entities/user.entity");
const country_entity_1 = require("../country/entities/country.entity");
const language_entity_1 = require("../language/entities/language.entity");
const filter_service_1 = require("../filter/filter.service");
const firebase_service_1 = require("../firebase/firebase.service");
const profile_verification_util_1 = require("../users/profile-verification.util");
const referral_code_util_1 = require("../users/referral-code.util");
let AuthService = class AuthService {
    constructor(jwtService, userRepo, countryRepo, languageRepo, filterService, firebaseService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.countryRepo = countryRepo;
        this.languageRepo = languageRepo;
        this.filterService = filterService;
        this.firebaseService = firebaseService;
    }
    generateToken(user) {
        return this.jwtService.sign({
            id: user.id,
            tokenVersion: Number(user.tokenVersion || 0),
        });
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
    async generateUniqueReferralCode() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const referralCode = (0, referral_code_util_1.generateReferralCode)();
            const existing = await this.userRepo.findOne({
                where: { referralCode },
                select: ['id'],
            });
            if (!existing)
                return referralCode;
        }
        throw new common_1.BadRequestException('Unable to generate referral code');
    }
    async findUserByPhone(phone) {
        return this.userRepo.findOne({
            where: { phone },
            relations: ['country', 'language'],
        });
    }
    async createOrGetUser(data) {
        const existing = await this.findUserByPhone(data.phone);
        if (existing)
            return existing;
        const countryId = Number(data.country);
        const languageId = Number(data.language);
        if (!Number.isInteger(countryId) || countryId <= 0) {
            throw new common_1.BadRequestException('countryId must be a valid ID');
        }
        if (!Number.isInteger(languageId) || languageId <= 0) {
            throw new common_1.BadRequestException('languageId must be a valid ID');
        }
        const country = await this.countryRepo.findOne({
            where: { id: countryId },
        });
        const language = await this.languageRepo.findOne({
            where: { id: languageId },
        });
        if (!country)
            throw new common_1.BadRequestException('Country not found');
        if (!language)
            throw new common_1.BadRequestException('Language not found');
        const defaultFilterPreferences = await this.filterService.getTopFiltersByJobs(9);
        const { country: _country, language: _language, countryId: _countryId, languageId: _languageId, photoUri: _photoUri, ...userData } = data;
        const user = this.userRepo.create({
            ...userData,
            country,
            language,
            isBanned: false,
            referralCode: data.referralCode || (await this.generateUniqueReferralCode()),
            isVerified: (0, profile_verification_util_1.computeUserIsVerified)(userData),
            filter_preferences: defaultFilterPreferences,
        });
        return this.userRepo.save(user);
    }
    async validateRegistrationRelations(countryId, languageId) {
        const [country, language] = await Promise.all([
            this.countryRepo.findOne({ where: { id: countryId } }),
            this.languageRepo.findOne({ where: { id: languageId } }),
        ]);
        if (!country)
            throw new common_1.BadRequestException('Country not found');
        if (!language)
            throw new common_1.BadRequestException('Language not found');
    }
    hashPassword(password) {
        const salt = (0, crypto_1.randomBytes)(16).toString('hex');
        const hash = (0, crypto_1.pbkdf2Sync)(password, salt, 1000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }
    validatePassword(password, storedHash, salt) {
        const hash = (0, crypto_1.pbkdf2Sync)(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === storedHash;
    }
    async validateUser(phone, password) {
        const user = await this.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid phone or password');
        const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid phone or password');
        if (user.isBanned)
            throw new common_1.UnauthorizedException('Your account is blocked!');
        return user;
    }
    async resetPassword(phone, salt, hash) {
        const user = await this.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        user.passwordSalt = salt;
        user.passwordHash = hash;
        user.tokenVersion = Number(user.tokenVersion || 0) + 1;
        return this.userRepo.save(user);
    }
    async validateUserByIdAndPassword(userId, password) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid user session');
        const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid password');
        if (user.isBanned)
            throw new common_1.UnauthorizedException('Your account is blocked!');
        return user;
    }
    async changePassword(userId, newPassword) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid user session');
        const { salt, hash } = this.hashPassword(newPassword);
        user.passwordSalt = salt;
        user.passwordHash = hash;
        user.tokenVersion = Number(user.tokenVersion || 0) + 1;
        return this.userRepo.save(user);
    }
    async changePhone(userId, newPhone) {
        const existing = await this.findUserByPhone(newPhone);
        if (existing && existing.id !== userId) {
            throw new common_1.BadRequestException('Phone already registered');
        }
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid user session');
        user.phone = newPhone;
        user.phoneVerifiedAt = new Date();
        user.isVerified = (0, profile_verification_util_1.computeUserIsVerified)(user);
        return this.userRepo.save(user);
    }
    async attachFcmToken(userId, fcmToken) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'fcmTokens', 'filter_preferences'],
        });
        if (!user)
            return;
        const tokens = new Set(user.fcmTokens || []);
        tokens.add(fcmToken);
        user.fcmTokens = Array.from(tokens);
        await this.userRepo.save(user);
        const filters = user.filter_preferences || [];
        if (filters.length) {
            await this.firebaseService.subscribeTokenToFilters(fcmToken, filters);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __param(3, (0, typeorm_1.InjectRepository)(language_entity_1.Language)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        filter_service_1.FilterService,
        firebase_service_1.FirebaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map