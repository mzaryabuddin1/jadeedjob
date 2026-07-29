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
exports.SupportTicketAttachment = void 0;
const typeorm_1 = require("typeorm");
const support_ticket_entity_1 = require("./support-ticket.entity");
let SupportTicketAttachment = class SupportTicketAttachment {
};
exports.SupportTicketAttachment = SupportTicketAttachment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SupportTicketAttachment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SupportTicketAttachment.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => support_ticket_entity_1.SupportTicket, (ticket) => ticket.uploadedAttachments, {
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", support_ticket_entity_1.SupportTicket)
], SupportTicketAttachment.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupportTicketAttachment.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupportTicketAttachment.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 36 }),
    __metadata("design:type", String)
], SupportTicketAttachment.prototype, "assetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupportTicketAttachment.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicketAttachment.prototype, "createdAt", void 0);
exports.SupportTicketAttachment = SupportTicketAttachment = __decorate([
    (0, typeorm_1.Entity)('support_ticket_attachments')
], SupportTicketAttachment);
//# sourceMappingURL=support-ticket-attachment.entity.js.map