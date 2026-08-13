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
exports.RegisterSendOtpDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const legal_api_dto_1 = require("../../legal/dto/legal-api.dto");
class RegisterSendOtpDto {
}
exports.RegisterSendOtpDto = RegisterSendOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '03162394467' }),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ oneOf: [{ type: 'integer' }, { type: 'string' }] }),
    __metadata("design:type", Object)
], RegisterSendOtpDto.prototype, "countryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ oneOf: [{ type: 'integer' }, { type: 'string' }] }),
    __metadata("design:type", Object)
], RegisterSendOtpDto.prototype, "languageId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'password' }),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'email' }),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "photoUri", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: -90, maximum: 90 }),
    __metadata("design:type", Number)
], RegisterSendOtpDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: -180, maximum: 180 }),
    __metadata("design:type", Number)
], RegisterSendOtpDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [legal_api_dto_1.LegalAcceptanceItemDto], maxItems: 3 }),
    __metadata("design:type", Array)
], RegisterSendOtpDto.prototype, "legalAcceptances", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ios', 'android', 'web', 'unknown'] }),
    __metadata("design:type", String)
], RegisterSendOtpDto.prototype, "clientPlatform", void 0);
//# sourceMappingURL=register-send-otp.dto.js.map