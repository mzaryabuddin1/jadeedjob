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
exports.LegalAcceptanceRequiredErrorDto = exports.LegalAcceptanceRequiredDetailsDto = exports.UserLegalAcceptanceDto = exports.SubmitLegalAcceptancesDto = exports.LegalAcceptanceItemDto = exports.LegalDocumentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class LegalDocumentDto {
}
exports.LegalDocumentDto = LegalDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['terms', 'privacy', 'community_guidelines'] }),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-08' }),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uri' }),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "contentUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "effectiveAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], LegalDocumentDto.prototype, "publishedAt", void 0);
class LegalAcceptanceItemDto {
}
exports.LegalAcceptanceItemDto = LegalAcceptanceItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['terms', 'privacy', 'community_guidelines'] }),
    __metadata("design:type", String)
], LegalAcceptanceItemDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LegalAcceptanceItemDto.prototype, "version", void 0);
class SubmitLegalAcceptancesDto {
}
exports.SubmitLegalAcceptancesDto = SubmitLegalAcceptancesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [LegalAcceptanceItemDto], minItems: 1, maxItems: 3 }),
    __metadata("design:type", Array)
], SubmitLegalAcceptancesDto.prototype, "acceptances", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['ios', 'android', 'web', 'unknown'] }),
    __metadata("design:type", String)
], SubmitLegalAcceptancesDto.prototype, "clientPlatform", void 0);
class UserLegalAcceptanceDto extends LegalAcceptanceItemDto {
}
exports.UserLegalAcceptanceDto = UserLegalAcceptanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['ios', 'android', 'web', 'unknown'] }),
    __metadata("design:type", String)
], UserLegalAcceptanceDto.prototype, "clientPlatform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], UserLegalAcceptanceDto.prototype, "acceptedAt", void 0);
class LegalAcceptanceRequiredDetailsDto {
}
exports.LegalAcceptanceRequiredDetailsDto = LegalAcceptanceRequiredDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['terms', 'privacy', 'community_guidelines'] }),
    __metadata("design:type", String)
], LegalAcceptanceRequiredDetailsDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LegalAcceptanceRequiredDetailsDto.prototype, "version", void 0);
class LegalAcceptanceRequiredErrorDto {
}
exports.LegalAcceptanceRequiredErrorDto = LegalAcceptanceRequiredErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 428 }),
    __metadata("design:type", Number)
], LegalAcceptanceRequiredErrorDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Precondition Required' }),
    __metadata("design:type", String)
], LegalAcceptanceRequiredErrorDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LEGAL_ACCEPTANCE_REQUIRED' }),
    __metadata("design:type", String)
], LegalAcceptanceRequiredErrorDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Current legal acceptance is required' }),
    __metadata("design:type", String)
], LegalAcceptanceRequiredErrorDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: LegalAcceptanceRequiredDetailsDto }),
    __metadata("design:type", LegalAcceptanceRequiredDetailsDto)
], LegalAcceptanceRequiredErrorDto.prototype, "details", void 0);
//# sourceMappingURL=legal-api.dto.js.map