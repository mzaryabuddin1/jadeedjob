"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_1 = require("@nestjs/jwt");
const users_module_1 = require("../users/users.module");
const otp_module_1 = require("../otp/otp.module");
const twilio_module_1 = require("../twilio/twilio.module");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const country_module_1 = require("../country/country.module");
const language_module_1 = require("../language/language.module");
const country_entity_1 = require("../country/entities/country.entity");
const language_entity_1 = require("../language/entities/language.entity");
const filter_module_1 = require("../filter/filter.module");
const firebase_module_1 = require("../firebase/firebase.module");
const auth_identity_entity_1 = require("./entities/auth-identity.entity");
const social_auth_service_1 = require("./social-auth.service");
const auth_social_challenge_entity_1 = require("./entities/auth-social-challenge.entity");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: '15m' },
            }),
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                country_entity_1.Country,
                language_entity_1.Language,
                auth_identity_entity_1.AuthIdentity,
                auth_social_challenge_entity_1.AuthSocialChallenge,
            ]),
            users_module_1.UsersModule,
            otp_module_1.OtpModule,
            country_module_1.CountryModule,
            language_module_1.LanguageModule,
            twilio_module_1.TwilioModule,
            filter_module_1.FilterModule,
            firebase_module_1.FirebaseModule
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, social_auth_service_1.SocialAuthService],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map