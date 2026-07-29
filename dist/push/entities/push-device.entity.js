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
exports.PushDevice = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let PushDevice = class PushDevice {
};
exports.PushDevice = PushDevice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PushDevice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PushDevice.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_push_devices_user',
    }),
    __metadata("design:type", user_entity_1.User)
], PushDevice.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], PushDevice.prototype, "installationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 512 }),
    __metadata("design:type", String)
], PushDevice.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['ios', 'android'] }),
    __metadata("design:type", String)
], PushDevice.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 40 }),
    __metadata("design:type", String)
], PushDevice.prototype, "appVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], PushDevice.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], PushDevice.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PushDevice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PushDevice.prototype, "updatedAt", void 0);
exports.PushDevice = PushDevice = __decorate([
    (0, typeorm_1.Entity)('push_devices'),
    (0, typeorm_1.Unique)('UQ_push_devices_user_installation', ['userId', 'installationId']),
    (0, typeorm_1.Index)('IDX_push_devices_token', ['token'], { unique: true })
], PushDevice);
//# sourceMappingURL=push-device.entity.js.map