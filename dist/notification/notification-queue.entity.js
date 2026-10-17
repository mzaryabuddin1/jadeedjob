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
exports.NotificationQueueItem = void 0;
const typeorm_1 = require("typeorm");
let NotificationQueueItem = class NotificationQueueItem {
};
exports.NotificationQueueItem = NotificationQueueItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], NotificationQueueItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40 }),
    __metadata("design:type", String)
], NotificationQueueItem.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], NotificationQueueItem.prototype, "groupKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], NotificationQueueItem.prototype, "recipientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], NotificationQueueItem.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'pending' }),
    __metadata("design:type", String)
], NotificationQueueItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', precision: 3 }),
    __metadata("design:type", Date)
], NotificationQueueItem.prototype, "queuedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', precision: 3, nullable: true }),
    __metadata("design:type", Date)
], NotificationQueueItem.prototype, "notBefore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", String)
], NotificationQueueItem.prototype, "claimToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', precision: 3, nullable: true }),
    __metadata("design:type", Date)
], NotificationQueueItem.prototype, "claimedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', precision: 3, nullable: true }),
    __metadata("design:type", Date)
], NotificationQueueItem.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], NotificationQueueItem.prototype, "attempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], NotificationQueueItem.prototype, "lastError", void 0);
exports.NotificationQueueItem = NotificationQueueItem = __decorate([
    (0, typeorm_1.Entity)('notification_queue'),
    (0, typeorm_1.Index)('IDX_notification_queue_pending', ['type', 'status', 'groupKey']),
    (0, typeorm_1.Index)('IDX_notification_queue_group', ['groupKey', 'status', 'processedAt'])
], NotificationQueueItem);
//# sourceMappingURL=notification-queue.entity.js.map