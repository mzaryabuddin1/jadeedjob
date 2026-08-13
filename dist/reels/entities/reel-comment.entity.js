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
exports.ReelComment = void 0;
const typeorm_1 = require("typeorm");
const reel_entity_1 = require("./reel.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let ReelComment = class ReelComment {
};
exports.ReelComment = ReelComment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReelComment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelComment.prototype, "reelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => reel_entity_1.Reel, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'reelId' }),
    __metadata("design:type", reel_entity_1.Reel)
], ReelComment.prototype, "reel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelComment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], ReelComment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ReelComment.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['visible', 'hidden', 'removed'],
        default: 'visible',
    }),
    __metadata("design:type", String)
], ReelComment.prototype, "moderationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ReelComment.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ReelComment.prototype, "deletedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 80 }),
    __metadata("design:type", String)
], ReelComment.prototype, "deletionReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReelComment.prototype, "createdAt", void 0);
exports.ReelComment = ReelComment = __decorate([
    (0, typeorm_1.Entity)('reel_comments'),
    (0, typeorm_1.Index)(['reelId', 'createdAt'])
], ReelComment);
//# sourceMappingURL=reel-comment.entity.js.map