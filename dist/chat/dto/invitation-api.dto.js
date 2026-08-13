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
exports.UpdateInvitationDto = exports.InvitationProjectionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class InvitationProjectionDto {
}
exports.InvitationProjectionDto = InvitationProjectionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid', description: 'Compatibility alias.' }),
    __metadata("design:type", String)
], InvitationProjectionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], InvitationProjectionDto.prototype, "invitationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
    }),
    __metadata("design:type", String)
], InvitationProjectionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['respond', 'cancel'], nullable: true }),
    __metadata("design:type", String)
], InvitationProjectionDto.prototype, "viewerAction", void 0);
class UpdateInvitationDto {
}
exports.UpdateInvitationDto = UpdateInvitationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['accept', 'decline', 'cancel'] }),
    __metadata("design:type", String)
], UpdateInvitationDto.prototype, "action", void 0);
//# sourceMappingURL=invitation-api.dto.js.map