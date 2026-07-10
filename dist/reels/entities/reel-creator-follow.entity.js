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
exports.ReelCreatorFollow = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let ReelCreatorFollow = class ReelCreatorFollow {
};
exports.ReelCreatorFollow = ReelCreatorFollow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReelCreatorFollow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelCreatorFollow.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'creatorId' }),
    __metadata("design:type", user_entity_1.User)
], ReelCreatorFollow.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelCreatorFollow.prototype, "followerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'followerId' }),
    __metadata("design:type", user_entity_1.User)
], ReelCreatorFollow.prototype, "follower", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReelCreatorFollow.prototype, "createdAt", void 0);
exports.ReelCreatorFollow = ReelCreatorFollow = __decorate([
    (0, typeorm_1.Entity)('reel_creator_follows'),
    (0, typeorm_1.Index)('IDX_reel_creator_follows_creator_follower_unique', [
        'creatorId',
        'followerId',
    ], { unique: true }),
    (0, typeorm_1.Index)('IDX_reel_creator_follows_follower_creator', ['followerId', 'creatorId'])
], ReelCreatorFollow);
//# sourceMappingURL=reel-creator-follow.entity.js.map