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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    generateToken(user) {
        return this.jwtService.sign({ id: user.id });
    }
    async createOrGetUser(data) {
        const existingUser = await this.prisma.user.findUnique({
            where: { phone: data.phone },
        });
        if (existingUser)
            return existingUser;
        return this.prisma.user.create({
            data: {
                ...data,
                countryId: Number(data.country),
                languageId: Number(data.language),
                isBanned: false,
            },
        });
    }
    async findUserByPhone(phone) {
        return this.prisma.user.findUnique({
            where: { phone },
            include: {
                country: true,
                language: true,
            },
        });
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
        const user = await this.prisma.user.findUnique({
            where: { phone },
            include: {
                country: true,
                language: true,
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid phone or password');
        const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid phone or password');
        if (user.isBanned)
            throw new common_1.UnauthorizedException('Your account is blocked!');
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map