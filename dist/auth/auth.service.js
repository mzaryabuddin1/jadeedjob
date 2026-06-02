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
const google_auth_service_1 = require("./google-auth.service");
let AuthService = class AuthService {
    constructor(jwtService, userRepo, countryRepo, languageRepo, filterService, firebaseService, googleAuthService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.countryRepo = countryRepo;
        this.languageRepo = languageRepo;
        this.filterService = filterService;
        this.firebaseService = firebaseService;
        this.googleAuthService = googleAuthService;
    }
    toPublicUser(user) {
        const { passwordHash, passwordSalt, ...publicUser } = user;
        return publicUser;
    }
    generateToken(user) {
        return this.jwtService.sign({ id: user.id });
    }
    async findUserByPhone(phone) {
        return this.userRepo.findOne({
            where: { phone },
            relations: ['country', 'language'],
        });
    }
    async findUserByGoogleId(googleId) {
        return this.userRepo.findOne({
            where: { googleId },
            relations: ['country', 'language'],
        });
    }
    async findUserByEmail(email) {
        return this.userRepo.findOne({
            where: { email },
            relations: ['country', 'language'],
        });
    }
    async resolveCountryLanguage(countryId, languageId) {
        const country = countryId
            ? await this.countryRepo.findOne({ where: { id: countryId } })
            : await this.countryRepo.findOne({ where: {}, order: { id: 'ASC' } });
        const language = languageId
            ? await this.languageRepo.findOne({ where: { id: languageId } })
            : await this.languageRepo.findOne({ where: {}, order: { id: 'ASC' } });
        if (!country || !language) {
            throw new common_1.BadRequestException('Country and language are required. Seed reference data or pass country/language IDs.');
        }
        return { country, language };
    }
    async createOrGetUser(data) {
        const existing = await this.findUserByPhone(data.phone);
        if (existing)
            return existing;
        const country = await this.countryRepo.findOne({
            where: { id: Number(data.country) },
        });
        const language = await this.languageRepo.findOne({
            where: { id: Number(data.language) },
        });
        const defaultFilterPreferences = await this.filterService.getTopFiltersByJobs(9);
        const user = this.userRepo.create({
            ...data,
            country,
            language,
            isBanned: false,
            filter_preferences: defaultFilterPreferences,
        });
        return this.userRepo.save(user);
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
        if (!user.passwordHash || !user.passwordSalt) {
            throw new common_1.UnauthorizedException('This account uses Google sign-in. Please log in with Google.');
        }
        const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid phone or password');
        if (user.isBanned)
            throw new common_1.UnauthorizedException('Your account is blocked!');
        return user;
    }
    async resetPassword(phone, salt, hash) {
        await this.userRepo.update({ phone }, { passwordSalt: salt, passwordHash: hash });
    }
    async loginWithGoogle(idToken, options) {
        const payload = await this.googleAuthService.verifyIdToken(idToken);
        const googleId = payload.sub;
        const email = payload.email?.toLowerCase();
        if (payload.email_verified === false) {
            throw new common_1.UnauthorizedException('Google email is not verified');
        }
        let user = await this.findUserByGoogleId(googleId);
        let isNewUser = false;
        if (!user && email) {
            user = await this.findUserByEmail(email);
            if (user) {
                user.googleId = googleId;
                user.authProvider = user.phone ? user.authProvider : 'google';
                if (!user.email)
                    user.email = email;
                if (payload.picture && !user.profile_photo) {
                    user.profile_photo = payload.picture;
                }
                user.isVerified = true;
                user = await this.userRepo.save(user);
            }
        }
        if (!user) {
            isNewUser = true;
            const { country, language } = await this.resolveCountryLanguage(options?.country, options?.language);
            const defaultFilterPreferences = await this.filterService.getTopFiltersByJobs(9);
            user = this.userRepo.create({
                googleId,
                authProvider: 'google',
                email: email ?? null,
                firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
                lastName: payload.family_name ||
                    payload.name?.split(' ').slice(1).join(' ') ||
                    '',
                profile_photo: payload.picture ?? null,
                phone: null,
                passwordHash: null,
                passwordSalt: null,
                country,
                language,
                isVerified: true,
                isBanned: false,
                filter_preferences: defaultFilterPreferences,
            });
            user = await this.userRepo.save(user);
            user = await this.findUserByGoogleId(googleId);
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Unable to create Google account');
        }
        if (user.isBanned) {
            throw new common_1.UnauthorizedException('Your account is blocked!');
        }
        if (options?.fcmToken) {
            await this.attachFcmToken(user.id, options.fcmToken);
            user = (await this.findUserByGoogleId(googleId));
        }
        return {
            access_token: this.generateToken(user),
            user: this.toPublicUser(user),
            isNewUser,
        };
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
        firebase_service_1.FirebaseService,
        google_auth_service_1.GoogleAuthService])
], AuthService);
//# sourceMappingURL=auth.service.js.map