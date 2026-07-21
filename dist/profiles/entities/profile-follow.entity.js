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
exports.ProfileFollow = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let ProfileFollow = class ProfileFollow {
};
exports.ProfileFollow = ProfileFollow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ProfileFollow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ProfileFollow.prototype, "followerUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'followerUserId',
        foreignKeyConstraintName: 'FK_profile_follows_follower_user',
    }),
    __metadata("design:type", user_entity_1.User)
], ProfileFollow.prototype, "follower", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['user', 'company'],
    }),
    __metadata("design:type", String)
], ProfileFollow.prototype, "profileType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ProfileFollow.prototype, "profileId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProfileFollow.prototype, "createdAt", void 0);
exports.ProfileFollow = ProfileFollow = __decorate([
    (0, typeorm_1.Entity)('profile_follows'),
    (0, typeorm_1.Unique)('UQ_profile_follows_follower_type_profile', [
        'followerUserId',
        'profileType',
        'profileId',
    ]),
    (0, typeorm_1.Index)('IDX_profile_follows_target_follower', [
        'profileType',
        'profileId',
        'followerUserId',
    ]),
    (0, typeorm_1.Index)('IDX_profile_follows_follower_target', [
        'followerUserId',
        'profileType',
        'profileId',
    ])
], ProfileFollow);
//# sourceMappingURL=profile-follow.entity.js.map