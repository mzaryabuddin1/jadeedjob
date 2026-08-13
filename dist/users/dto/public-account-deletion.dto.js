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
exports.BlockedAccountDeletionDto = exports.ScheduledAccountDeletionDto = exports.PublicAccountDeletionConfirmDto = exports.PublicAccountDeletionSendOtpDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class PublicAccountDeletionSendOtpDto {
}
exports.PublicAccountDeletionSendOtpDto = PublicAccountDeletionSendOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '03162394467' }),
    __metadata("design:type", String)
], PublicAccountDeletionSendOtpDto.prototype, "phone", void 0);
class PublicAccountDeletionConfirmDto extends PublicAccountDeletionSendOtpDto {
}
exports.PublicAccountDeletionConfirmDto = PublicAccountDeletionConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicAccountDeletionConfirmDto.prototype, "otp", void 0);
class ScheduledAccountDeletionDto {
}
exports.ScheduledAccountDeletionDto = ScheduledAccountDeletionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'scheduled' }),
    __metadata("design:type", String)
], ScheduledAccountDeletionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], ScheduledAccountDeletionDto.prototype, "scheduledDeletionAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: 'array', items: { type: 'object' } }),
    __metadata("design:type", Array)
], ScheduledAccountDeletionDto.prototype, "blockers", void 0);
class BlockedAccountDeletionDto {
}
exports.BlockedAccountDeletionDto = BlockedAccountDeletionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'blocked' }),
    __metadata("design:type", String)
], BlockedAccountDeletionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ACCOUNT_DELETION_BLOCKED' }),
    __metadata("design:type", String)
], BlockedAccountDeletionDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BlockedAccountDeletionDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: 'object',
        properties: {
            companies: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'integer' },
                        name: { type: 'string' },
                        reason: { type: 'string', example: 'sole_owner' },
                    },
                },
            },
        },
    }),
    __metadata("design:type", Object)
], BlockedAccountDeletionDto.prototype, "details", void 0);
//# sourceMappingURL=public-account-deletion.dto.js.map