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
exports.SupportTicket = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const support_ticket_attachment_entity_1 = require("./support-ticket-attachment.entity");
let SupportTicket = class SupportTicket {
};
exports.SupportTicket = SupportTicket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SupportTicket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SupportTicket.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], SupportTicket.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['feedback', 'complaint'],
    }),
    __metadata("design:type", String)
], SupportTicket.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['app', 'payment', 'job_post', 'worker', 'chat', 'suggestion', 'other'],
        default: 'other',
    }),
    __metadata("design:type", String)
], SupportTicket.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "preferredContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'open' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SupportTicket.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => support_ticket_attachment_entity_1.SupportTicketAttachment, (attachment) => attachment.ticket, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], SupportTicket.prototype, "uploadedAttachments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicket.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicket.prototype, "updatedAt", void 0);
exports.SupportTicket = SupportTicket = __decorate([
    (0, typeorm_1.Entity)('support_tickets')
], SupportTicket);
//# sourceMappingURL=support-ticket.entity.js.map