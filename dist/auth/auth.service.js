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
const city_entity_1 = require("../city/entities/city.entity");
const filter_service_1 = require("../filter/filter.service");
const firebase_service_1 = require("../firebase/firebase.service");
const google_auth_service_1 = require("./google-auth.service");
const facebook_auth_service_1 = require("./facebook-auth.service");
let AuthService = class AuthService {
    constructor(jwtService, userRepo, countryRepo, languageRepo, cityRepo, filterService, firebaseService, googleAuthService, facebookAuthService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.countryRepo = countryRepo;
        this.languageRepo = languageRepo;
        this.cityRepo = cityRepo;
        this.filterService = filterService;
        this.firebaseService = firebaseService;
        this.googleAuthService = googleAuthService;
        this.facebookAuthService = facebookAuthService;
    }
    isKycComplete(user) {
        return !!(user?.phone && String(user.phone).trim());
    }
    toPublicUser(user) {
        const { passwordHash, passwordSalt, ...publicUser } = user;
        return {
            ...publicUser,
            kyc_complete: this.isKycComplete(user),
        };
    }
    authResponse(user, extras) {
        return {
            ...(extras?.message ? { message: extras.message } : {}),
            ...(extras?.isNewUser !== undefined
                ? { isNewUser: extras.isNewUser }
                : {}),
            access_token: this.generateToken(user),
            kyc_complete: this.isKycComplete(user),
            user: this.toPublicUser(user),
        };
    }
    generateToken(user) {
        return this.jwtService.sign({ id: user.id });
    }
    async findUserById(id) {
        return this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language', 'cityEntity'],
        });
    }
    async findUserByPhone(phone) {
        return this.userRepo.findOne({
            where: { phone },
            relations: ['country', 'language', 'cityEntity'],
        });
    }
    async findUserByGoogleId(googleId) {
        return this.userRepo.findOne({
            where: { googleId },
            relations: ['country', 'language', 'cityEntity'],
        });
    }
    async findUserByFacebookId(facebookId) {
        return this.userRepo.findOne({
            where: { facebookId },
            relations: ['country', 'language', 'cityEntity'],
        });
    }
    async findUserByEmail(email) {
        return this.userRepo.findOne({
            where: { email },
            relations: ['country', 'language', 'cityEntity'],
        });
    }
    async resolveCountryLanguage(countryId, languageId) {
        const country = countryId
            ? await this.countryRepo.findOne({ where: { id: countryId } })
            : await this.countryRepo.findOne({ where: {}, order: { id: 'ASC' } });
        const language = languageId
            ? await this.languageRepo.findOne({ where: { id: languageId } })
            : await this.languageRepo.findOne({ where: {}, order: { id: 'ASC' } });
        return { country: country ?? null, language: language ?? null };
    }
    async resolveCity(cityId) {
        if (!cityId)
            return null;
        const city = await this.cityRepo.findOne({ where: { id: Number(cityId) } });
        if (!city)
            throw new common_1.BadRequestException('Invalid city id');
        return city;
    }
    async assertEmailAvailable(email, excludeUserId) {
        const existing = await this.userRepo.findOne({
            where: excludeUserId
                ? { email, id: (0, typeorm_2.Not)(excludeUserId) }
                : { email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email already registered');
        }
    }
    async createOrGetUser(data) {
        const existing = await this.findUserByPhone(data.phone);
        if (existing)
            return existing;
        if (data.email) {
            await this.assertEmailAvailable(data.email);
        }
        const { country: countryId, language: languageId, city: cityId, purpose: _purpose, ...rest } = data;
        const country = await this.countryRepo.findOne({
            where: { id: Number(countryId) },
        });
        if (!country)
            throw new common_1.BadRequestException('Invalid country id');
        const language = await this.languageRepo.findOne({
            where: { id: Number(languageId) },
        });
        if (!language)
            throw new common_1.BadRequestException('Invalid language id');
        const cityEntity = await this.resolveCity(cityId !== undefined && cityId !== null ? Number(cityId) : undefined);
        const defaultFilterPreferences = await this.filterService.getTopFiltersByJobs(9);
        const user = this.userRepo.create({
            ...rest,
            country,
            language,
            cityEntity,
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
            const hint = user.authProvider === 'facebook'
                ? 'Facebook'
                : user.authProvider === 'google'
                    ? 'Google'
                    : 'social';
            throw new common_1.UnauthorizedException(`This account uses ${hint} sign-in. Please log in with ${hint}.`);
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
    async updateUserEmail(userId, email) {
        await this.assertEmailAvailable(email, userId);
        const user = await this.findUserById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        user.email = email;
        return this.userRepo.save(user);
    }
    async completeKyc(userId, data) {
        const phoneTaken = await this.findUserByPhone(data.phone);
        if (phoneTaken && phoneTaken.id !== userId) {
            throw new common_1.BadRequestException('Phone already registered');
        }
        const user = await this.findUserById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        user.phone = data.phone;
        user.isVerified = true;
        user.kyc_status = 'phone_verified';
        if (data.country) {
            const country = await this.countryRepo.findOne({
                where: { id: Number(data.country) },
            });
            if (!country)
                throw new common_1.BadRequestException('Invalid country id');
            user.country = country;
        }
        if (data.language) {
            const language = await this.languageRepo.findOne({
                where: { id: Number(data.language) },
            });
            if (!language)
                throw new common_1.BadRequestException('Invalid language id');
            user.language = language;
        }
        if (data.city !== undefined && data.city !== null) {
            user.cityEntity = await this.resolveCity(Number(data.city));
        }
        return this.userRepo.save(user);
    }
    async loginWithGoogle(idToken, options) {
        const profile = await this.googleAuthService.getProfileFromToken(idToken);
        let user = await this.findUserByGoogleId(profile.providerId);
        if (!user && profile.email) {
            user = await this.findUserByEmail(profile.email);
        }
        let isNewUser = false;
        if (user) {
            user.googleId = profile.providerId;
            user.authProvider = 'google';
            user.email = profile.email ?? user.email;
            user.firstName = profile.firstName;
            user.lastName = profile.lastName;
            if (profile.picture)
                user.profile_photo = profile.picture;
            user.isVerified = true;
            user = await this.userRepo.save(user);
        }
        else {
            isNewUser = true;
            const { country, language } = await this.resolveCountryLanguage(options?.country, options?.language);
            user = await this.userRepo.save(this.userRepo.create({
                googleId: profile.providerId,
                authProvider: 'google',
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                profile_photo: profile.picture,
                phone: null,
                passwordHash: null,
                passwordSalt: null,
                country,
                language,
                isVerified: true,
                isBanned: false,
                kyc_status: 'pending',
                filter_preferences: await this.filterService.getTopFiltersByJobs(9),
            }));
        }
        user = await this.findUserByGoogleId(profile.providerId);
        if (!user) {
            throw new common_1.UnauthorizedException('Could not save Google user');
        }
        if (user.isBanned) {
            throw new common_1.UnauthorizedException('Your account is blocked!');
        }
        if (options?.fcmToken) {
            await this.attachFcmToken(user.id, options.fcmToken);
            user = (await this.findUserByGoogleId(profile.providerId));
        }
        return this.authResponse(user, {
            message: isNewUser ? 'Signup successful' : 'Login successful',
            isNewUser,
        });
    }
    async loginWithFacebook(accessToken, options) {
        const profile = await this.facebookAuthService.getProfileFromToken(accessToken);
        let user = await this.findUserByFacebookId(profile.providerId);
        if (!user && profile.email) {
            user = await this.findUserByEmail(profile.email);
        }
        let isNewUser = false;
        if (user) {
            user.facebookId = profile.providerId;
            user.authProvider = 'facebook';
            user.email = profile.email ?? user.email;
            user.firstName = profile.firstName;
            user.lastName = profile.lastName;
            if (profile.picture)
                user.profile_photo = profile.picture;
            user.isVerified = true;
            user = await this.userRepo.save(user);
        }
        else {
            isNewUser = true;
            const { country, language } = await this.resolveCountryLanguage(options?.country, options?.language);
            user = await this.userRepo.save(this.userRepo.create({
                facebookId: profile.providerId,
                authProvider: 'facebook',
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                profile_photo: profile.picture,
                phone: null,
                passwordHash: null,
                passwordSalt: null,
                country,
                language,
                isVerified: true,
                isBanned: false,
                kyc_status: 'pending',
                filter_preferences: await this.filterService.getTopFiltersByJobs(9),
            }));
        }
        user = await this.findUserByFacebookId(profile.providerId);
        if (!user) {
            throw new common_1.UnauthorizedException('Could not save Facebook user');
        }
        if (user.isBanned) {
            throw new common_1.UnauthorizedException('Your account is blocked!');
        }
        if (options?.fcmToken) {
            await this.attachFcmToken(user.id, options.fcmToken);
            user = (await this.findUserByFacebookId(profile.providerId));
        }
        return this.authResponse(user, {
            message: isNewUser ? 'Signup successful' : 'Login successful',
            isNewUser,
        });
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
    __param(4, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        filter_service_1.FilterService,
        firebase_service_1.FirebaseService,
        google_auth_service_1.GoogleAuthService,
        facebook_auth_service_1.FacebookAuthService])
], AuthService);
//# sourceMappingURL=auth.service.js.map