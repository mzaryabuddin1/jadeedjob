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
exports.ModerationReportCreatedDto = exports.ModerationReportDto = exports.ResolveModerationReportDto = exports.CreateModerationReportDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreateModerationReportDto {
}
exports.CreateModerationReportDto = CreateModerationReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'spam',
            'harassment',
            'impersonation',
            'misleading',
            'false_information',
            'fraud',
            'unsafe',
            'inappropriate',
            'other',
        ],
    }),
    __metadata("design:type", String)
], CreateModerationReportDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 1000, nullable: true }),
    __metadata("design:type", String)
], CreateModerationReportDto.prototype, "details", void 0);
class ResolveModerationReportDto {
}
exports.ResolveModerationReportDto = ResolveModerationReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'] }),
    __metadata("design:type", String)
], ResolveModerationReportDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 2000, nullable: true }),
    __metadata("design:type", String)
], ResolveModerationReportDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'date-time', nullable: true }),
    __metadata("design:type", String)
], ResolveModerationReportDto.prototype, "suspensionEndsAt", void 0);
class ModerationReportDto {
}
exports.ModerationReportDto = ModerationReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '17' }),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'post',
            'post_comment',
            'reel',
            'reel_comment',
            'user',
            'company',
            'chat_message',
            'job',
        ],
    }),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "targetType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "targetId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pending', 'dismissed', 'actioned'] }),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'],
        nullable: true,
    }),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], ModerationReportDto.prototype, "createdAt", void 0);
class ModerationReportCreatedDto {
}
exports.ModerationReportCreatedDto = ModerationReportCreatedDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ModerationReportCreatedDto.prototype, "reportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'pending' }),
    __metadata("design:type", String)
], ModerationReportCreatedDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ModerationReportCreatedDto.prototype, "reported", void 0);
//# sourceMappingURL=moderation-api.dto.js.map