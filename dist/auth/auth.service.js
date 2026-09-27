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
const user_auth_identity_entity_1 = require("../users/entities/user-auth-identity.entity");
const country_entity_1 = require("../country/entities/country.entity");
const language_entity_1 = require("../language/entities/language.entity");
const city_entity_1 = require("../city/entities/city.entity");
const filter_service_1 = require("../filter/filter.service");
const firebase_service_1 = require("../firebase/firebase.service");
const google_auth_service_1 = require("./google-auth.service");
const facebook_auth_service_1 = require("./facebook-auth.service");
let AuthService = class AuthService {
    constructor(jwtService, userRepo, identityRepo, countryRepo, languageRepo, cityRepo, filterService, firebaseService, googleAuthService, facebookAuthService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.identityRepo = identityRepo;
        this.countryRepo = countryRepo;
        this.languageRepo = languageRepo;
        this.cityRepo = cityRepo;
        this.filterService = filterService;
        this.firebaseService = firebaseService;
        this.googleAuthService = googleAuthService;
        this.facebookAuthService = facebookAuthService;
    }
    async onModuleInit() {
        try {
            await this.migrateLegacyIdentities();
        }
        catch (err) {
            console.warn('[AuthService] identity migration skipped:', err instanceof Error ? err.message : err);
        }
    }
    async migrateLegacyIdentities() {
        const users = await this.userRepo.find({
            select: ['id', 'googleId', 'facebookId', 'email'],
        });
        for (const user of users) {
            if (user.googleId) {
                await this.ensureIdentityRow(user.id, 'google', user.googleId, user.email);
            }
            if (user.facebookId) {
                await this.ensureIdentityRow(user.id, 'facebook', user.facebookId, user.email);
            }
        }
    }
    async ensureIdentityRow(userId, provider, providerId, providerEmail) {
        const existing = await this.identityRepo.findOne({
            where: { provider, providerId },
        });
        if (existing)
            return existing;
        await this.identityRepo.insert({
            userId,
            provider,
            providerId,
            providerEmail: providerEmail
                ? String(providerEmail).trim().toLowerCase()
                : null,
        });
        return this.identityRepo.findOneOrFail({
            where: { provider, providerId },
        });
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
    pendingKycResponse(pending, extras) {
        const kyc_token = this.generateKycToken(pending);
        const emailTaken = !!extras?.emailAlreadyRegistered;
        return {
            message: emailTaken
                ? 'This Google email is already on a phone account. Enter that same phone and verify OTP to link Google (we do not auto-login by email).'
                : 'Complete phone verification to continue',
            kyc_complete: false,
            isNewUser: !emailTaken,
            email_already_registered: emailTaken,
            ...(emailTaken && extras?.hintPhone
                ? {
                    hint: `Use phone ${extras.hintPhone} (same as your registered account) then Verify OTP to link this Google login.`,
                    registered_phone_hint: extras.hintPhone,
                }
                : {}),
            kyc_token,
            profile: {
                provider: pending.provider,
                email: pending.email,
                firstName: pending.firstName,
                lastName: pending.lastName,
                picture: pending.picture,
            },
        };
    }
    maskPhone(phone) {
        const p = String(phone);
        if (p.length < 6)
            return '****';
        return `${p.slice(0, 4)}****${p.slice(-3)}`;
    }
    async pendingSocialWithEmailHint(pending) {
        if (!pending.email) {
            return this.pendingKycResponse(pending);
        }
        const normalized = String(pending.email).trim().toLowerCase();
        const byEmail = await this.userRepo
            .createQueryBuilder('u')
            .where('LOWER(u.email) = :email', { email: normalized })
            .getOne();
        if (byEmail?.phone) {
            return this.pendingKycResponse(pending, {
                emailAlreadyRegistered: true,
                hintPhone: this.maskPhone(byEmail.phone),
            });
        }
        const linked = await this.identityRepo
            .createQueryBuilder('i')
            .where('LOWER(i.providerEmail) = :email', { email: normalized })
            .getOne();
        if (linked) {
            return this.pendingKycResponse(pending, {
                emailAlreadyRegistered: true,
                hintPhone: null,
            });
        }
        return this.pendingKycResponse(pending);
    }
    generateToken(user) {
        return this.jwtService.sign({ id: user.id });
    }
    async listDebugAccounts() {
        const users = await this.userRepo.find({
            relations: ['authIdentities', 'country', 'language', 'cityEntity'],
            order: { id: 'ASC' },
        });
        return users.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            email: u.email,
            authProvider: u.authProvider,
            googleId: u.googleId,
            facebookId: u.facebookId,
            kyc_complete: this.isKycComplete(u),
            kyc_status: u.kyc_status,
            isVerified: u.isVerified,
            countryId: u.country?.id ?? null,
            languageId: u.language?.id ?? null,
            cityId: u.cityEntity?.id ?? null,
            createdAt: u.createdAt,
            identities: (u.authIdentities || []).map((i) => ({
                id: i.id,
                provider: i.provider,
                providerId: i.providerId,
                providerEmail: i.providerEmail,
                linkedAt: i.linkedAt,
            })),
        }));
    }
    async deleteDebugAccount(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        await this.identityRepo.delete({ userId });
        await this.userRepo.delete(userId);
        return { deleted: true, id: userId };
    }
    generateKycToken(pending) {
        return this.jwtService.sign(pending, { expiresIn: '30m' });
    }
    verifyKycToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            if (payload?.purpose !== 'kyc_pending' || !payload.providerId) {
                throw new common_1.UnauthorizedException('Invalid KYC token');
            }
            return payload;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.UnauthorizedException('KYC token expired or invalid');
        }
    }
    generateLinkToken(payload) {
        return this.jwtService.sign(payload, { expiresIn: '15m' });
    }
    verifyLinkToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            if (payload?.purpose !== 'link_confirm' || !payload.userId) {
                throw new common_1.UnauthorizedException('Invalid link token');
            }
            return payload;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.UnauthorizedException('Link token expired or invalid');
        }
    }
    tryGetUserIdFromAuthHeader(authHeader) {
        if (!authHeader?.startsWith('Bearer '))
            return null;
        try {
            const decoded = this.jwtService.verify(authHeader.slice(7).trim());
            return decoded?.id ?? null;
        }
        catch {
            return null;
        }
    }
    async findUserById(id) {
        return this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language', 'cityEntity', 'authIdentities'],
        });
    }
    async findUserByPhone(phone) {
        return this.userRepo.findOne({
            where: { phone },
            relations: ['country', 'language', 'cityEntity', 'authIdentities'],
        });
    }
    async findUserByEmail(email) {
        return this.userRepo.findOne({
            where: { email },
            relations: ['country', 'language', 'cityEntity', 'authIdentities'],
        });
    }
    async findUserByProvider(provider, providerId) {
        const identity = await this.identityRepo.findOne({
            where: { provider, providerId },
        });
        if (identity) {
            return this.findUserById(identity.userId);
        }
        if (provider === 'google') {
            return this.userRepo.findOne({
                where: { googleId: providerId },
                relations: ['country', 'language', 'cityEntity', 'authIdentities'],
            });
        }
        return this.userRepo.findOne({
            where: { facebookId: providerId },
            relations: ['country', 'language', 'cityEntity', 'authIdentities'],
        });
    }
    async listProviderTypesForUser(userId) {
        const rows = await this.identityRepo.find({
            where: { userId },
            select: ['provider'],
        });
        return [...new Set(rows.map((r) => r.provider))];
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
        const normalized = String(email).trim().toLowerCase();
        if (!normalized)
            return;
        const existing = await this.userRepo
            .createQueryBuilder('u')
            .where('LOWER(u.email) = :email', { email: normalized })
            .andWhere(excludeUserId ? 'u.id != :excludeUserId' : '1=1', {
            excludeUserId,
        })
            .getOne();
        if (existing) {
            throw new common_1.BadRequestException('Email already registered');
        }
        const linkedQb = this.identityRepo
            .createQueryBuilder('i')
            .where('LOWER(i.providerEmail) = :email', { email: normalized });
        if (excludeUserId) {
            linkedQb.andWhere('i.userId != :excludeUserId', { excludeUserId });
        }
        const linked = await linkedQb.getOne();
        if (linked) {
            throw new common_1.BadRequestException('Email already linked to another account via Google/Facebook');
        }
    }
    async createOrGetUser(data) {
        const existing = await this.findUserByPhone(data.phone);
        if (existing)
            return existing;
        if (data.email) {
            await this.assertEmailAvailable(data.email);
            data = { ...data, email: String(data.email).trim().toLowerCase() };
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
        delete user.authIdentities;
        delete user.work_experience;
        delete user.education;
        delete user.certifications;
        return this.userRepo.save(user);
    }
    async linkIdentityToUser(user, pending, options) {
        const ownedBy = await this.findUserByProvider(pending.provider, pending.providerId);
        if (ownedBy && ownedBy.id !== user.id) {
            throw new common_1.ConflictException(`This ${pending.provider} account is already linked to another user`);
        }
        if (ownedBy && ownedBy.id === user.id) {
            await this.applyPrimarySocialMirrors(user, pending);
            return {
                status: 'ok',
                user: (await this.findUserById(user.id)),
                isNewUser: false,
            };
        }
        const existingOfProvider = await this.identityRepo.count({
            where: { userId: user.id, provider: pending.provider },
        });
        if (existingOfProvider > 0 && !options?.forceAdditional) {
            const link_token = this.generateLinkToken({
                purpose: 'link_confirm',
                userId: user.id,
                provider: pending.provider,
                providerId: pending.providerId,
                providerEmail: pending.email ?? null,
                firstName: pending.firstName || user.firstName,
                lastName: pending.lastName || user.lastName,
                picture: pending.picture ?? null,
            });
            return {
                status: 'needs_confirmation',
                user,
                link_token,
                message: `This account already has a ${pending.provider} login. Confirm to link an additional ${pending.provider} account (existing email / primary ${pending.provider} will not be replaced).`,
                existing_providers: await this.listProviderTypesForUser(user.id),
            };
        }
        if (pending.email) {
            await this.assertEmailAvailable(pending.email, user.id);
        }
        await this.ensureIdentityRow(user.id, pending.provider, pending.providerId, pending.email);
        await this.applyPrimarySocialMirrors(user, pending);
        const fresh = (await this.findUserById(user.id));
        return { status: 'ok', user: fresh, isNewUser: false };
    }
    async applyPrimarySocialMirrors(user, pending) {
        const patch = {};
        if (pending.provider === 'google' && !user.googleId) {
            patch.googleId = pending.providerId;
        }
        if (pending.provider === 'facebook' && !user.facebookId) {
            patch.facebookId = pending.providerId;
        }
        if (!user.email && pending.email) {
            try {
                await this.assertEmailAvailable(pending.email, user.id);
                patch.email = String(pending.email).trim().toLowerCase();
            }
            catch {
            }
        }
        if (pending.picture && !user.profile_photo) {
            patch.profile_photo = pending.picture;
        }
        if (Object.keys(patch).length) {
            await this.userRepo.update(user.id, patch);
        }
    }
    async confirmLinkIdentity(linkToken) {
        const pending = this.verifyLinkToken(linkToken);
        const user = await this.findUserById(pending.userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        if (user.isBanned)
            throw new common_1.UnauthorizedException('Your account is blocked!');
        const result = await this.linkIdentityToUser(user, {
            provider: pending.provider,
            providerId: pending.providerId,
            email: pending.providerEmail,
            firstName: pending.firstName,
            lastName: pending.lastName,
            picture: pending.picture,
        }, { forceAdditional: true });
        if (result.status !== 'ok') {
            throw new common_1.BadRequestException('Could not confirm link');
        }
        if (pending.fcmToken) {
            await this.attachFcmToken(result.user.id, pending.fcmToken);
        }
        return this.authResponse(result.user, {
            message: 'Social account linked successfully',
            isNewUser: false,
        });
    }
    async resolveSocialKyc(pending, data) {
        const byProvider = await this.findUserByProvider(pending.provider, pending.providerId);
        const phoneUser = await this.findUserByPhone(data.phone);
        if (byProvider && phoneUser && byProvider.id !== phoneUser.id) {
            throw new common_1.ConflictException(`This ${pending.provider} account is linked to a different user than this phone`);
        }
        if (byProvider && (!phoneUser || phoneUser.id === byProvider.id)) {
            let user = await this.completeKyc(byProvider.id, data);
            await this.applyPrimarySocialMirrors(user, pending);
            if (data.fcmToken || pending.fcmToken) {
                await this.attachFcmToken(user.id, data.fcmToken || pending.fcmToken);
            }
            return {
                status: 'ok',
                user: (await this.findUserById(user.id)),
                isNewUser: false,
            };
        }
        if (phoneUser) {
            const result = await this.linkIdentityToUser(phoneUser, pending);
            if (result.status === 'ok' && (data.fcmToken || pending.fcmToken)) {
                await this.attachFcmToken(result.user.id, data.fcmToken || pending.fcmToken);
                result.user = (await this.findUserById(result.user.id));
            }
            if (result.status === 'needs_confirmation') {
                result.link_token = this.generateLinkToken({
                    purpose: 'link_confirm',
                    userId: phoneUser.id,
                    provider: pending.provider,
                    providerId: pending.providerId,
                    providerEmail: pending.email,
                    firstName: pending.firstName,
                    lastName: pending.lastName,
                    picture: pending.picture,
                    fcmToken: data.fcmToken || pending.fcmToken,
                });
            }
            return result;
        }
        const countryId = data.country ?? pending.country;
        const languageId = data.language ?? pending.language;
        const { country, language } = await this.resolveCountryLanguage(countryId, languageId);
        const cityEntity = await this.resolveCity(data.city !== undefined && data.city !== null
            ? Number(data.city)
            : undefined);
        if (pending.email) {
            try {
                await this.assertEmailAvailable(pending.email);
            }
            catch {
                throw new common_1.ConflictException('This social email is already used by another account. Use a different phone or contact support.');
            }
        }
        let user = await this.userRepo.save(this.userRepo.create({
            googleId: pending.provider === 'google' ? pending.providerId : null,
            facebookId: pending.provider === 'facebook' ? pending.providerId : null,
            authProvider: pending.provider,
            email: pending.email,
            firstName: pending.firstName,
            lastName: pending.lastName,
            profile_photo: pending.picture,
            phone: data.phone,
            passwordHash: null,
            passwordSalt: null,
            country,
            language,
            cityEntity,
            isVerified: true,
            isBanned: false,
            kyc_status: 'phone_verified',
            filter_preferences: await this.filterService.getTopFiltersByJobs(9),
        }));
        await this.ensureIdentityRow(user.id, pending.provider, pending.providerId, pending.email);
        const fcm = data.fcmToken || pending.fcmToken;
        if (fcm) {
            await this.attachFcmToken(user.id, fcm);
        }
        user = (await this.findUserById(user.id));
        return { status: 'ok', user, isNewUser: true };
    }
    async finishSocialLogin(user, profile, fcmToken) {
        await this.ensureIdentityRow(user.id, profile.provider, profile.providerId, profile.email);
        let current = user;
        if (profile.picture && !current.profile_photo) {
            current.profile_photo = profile.picture;
            current = await this.userRepo.save(current);
        }
        if (current.isBanned) {
            throw new common_1.UnauthorizedException('Your account is blocked!');
        }
        if (fcmToken) {
            await this.attachFcmToken(current.id, fcmToken);
            current = (await this.findUserById(current.id));
        }
        return this.authResponse(current, {
            message: 'Login successful',
            isNewUser: false,
        });
    }
    async loginWithGoogle(idToken, options) {
        const profile = await this.googleAuthService.getProfileFromToken(idToken);
        const user = await this.findUserByProvider('google', profile.providerId);
        if (user) {
            return this.finishSocialLogin(user, {
                provider: 'google',
                providerId: profile.providerId,
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                picture: profile.picture,
            }, options?.fcmToken);
        }
        return this.pendingSocialWithEmailHint({
            purpose: 'kyc_pending',
            provider: 'google',
            providerId: profile.providerId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            picture: profile.picture,
            country: options?.country,
            language: options?.language,
            fcmToken: options?.fcmToken,
        });
    }
    async loginWithFacebook(accessToken, options) {
        const profile = await this.facebookAuthService.getProfileFromToken(accessToken);
        const user = await this.findUserByProvider('facebook', profile.providerId);
        if (user) {
            return this.finishSocialLogin(user, {
                provider: 'facebook',
                providerId: profile.providerId,
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                picture: profile.picture,
            }, options?.fcmToken);
        }
        return this.pendingSocialWithEmailHint({
            purpose: 'kyc_pending',
            provider: 'facebook',
            providerId: profile.providerId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            picture: profile.picture,
            country: options?.country,
            language: options?.language,
            fcmToken: options?.fcmToken,
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
    __param(2, (0, typeorm_1.InjectRepository)(user_auth_identity_entity_1.UserAuthIdentity)),
    __param(3, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __param(4, (0, typeorm_1.InjectRepository)(language_entity_1.Language)),
    __param(5, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
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