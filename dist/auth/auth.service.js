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
const VoiceResponse_1 = require("twilio/lib/twiml/VoiceResponse");
const filter_service_1 = require("../filter/filter.service");
let AuthService = class AuthService {
    constructor(jwtService, userRepo, countryRepo, languageRepo, filterService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.countryRepo = countryRepo;
        this.languageRepo = languageRepo;
        this.filterService = filterService;
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __param(3, (0, typeorm_1.InjectRepository)(VoiceResponse_1.Language)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        filter_service_1.FilterService])
], AuthService);
//# sourceMappingURL=auth.service.js.map