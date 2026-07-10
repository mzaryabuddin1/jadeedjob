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
exports.ReelSave = void 0;
const typeorm_1 = require("typeorm");
const reel_entity_1 = require("./reel.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let ReelSave = class ReelSave {
};
exports.ReelSave = ReelSave;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReelSave.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelSave.prototype, "reelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => reel_entity_1.Reel, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'reelId' }),
    __metadata("design:type", reel_entity_1.Reel)
], ReelSave.prototype, "reel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelSave.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], ReelSave.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReelSave.prototype, "createdAt", void 0);
exports.ReelSave = ReelSave = __decorate([
    (0, typeorm_1.Entity)('reel_saves'),
    (0, typeorm_1.Index)(['reelId', 'userId'], { unique: true })
], ReelSave);
//# sourceMappingURL=reel-save.entity.js.map