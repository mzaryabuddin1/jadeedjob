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
exports.ProfileBlock = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let ProfileBlock = class ProfileBlock {
};
exports.ProfileBlock = ProfileBlock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ProfileBlock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ProfileBlock.prototype, "blockerUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'blockerUserId',
        foreignKeyConstraintName: 'FK_profile_blocks_blocker',
    }),
    __metadata("design:type", user_entity_1.User)
], ProfileBlock.prototype, "blocker", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['user', 'company'] }),
    __metadata("design:type", String)
], ProfileBlock.prototype, "profileType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ProfileBlock.prototype, "profileId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProfileBlock.prototype, "createdAt", void 0);
exports.ProfileBlock = ProfileBlock = __decorate([
    (0, typeorm_1.Entity)('profile_blocks'),
    (0, typeorm_1.Unique)('UQ_profile_blocks_blocker_target', [
        'blockerUserId',
        'profileType',
        'profileId',
    ]),
    (0, typeorm_1.Index)('IDX_profile_blocks_target', ['profileType', 'profileId'])
], ProfileBlock);
//# sourceMappingURL=profile-block.entity.js.map