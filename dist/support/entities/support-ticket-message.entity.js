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
exports.SupportTicketMessage = void 0;
const typeorm_1 = require("typeorm");
const support_ticket_entity_1 = require("./support-ticket.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let SupportTicketMessage = class SupportTicketMessage {
};
exports.SupportTicketMessage = SupportTicketMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SupportTicketMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SupportTicketMessage.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => support_ticket_entity_1.SupportTicket, (ticket) => ticket.messages, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({
        name: 'ticketId',
        foreignKeyConstraintName: 'FK_support_ticket_messages_ticket',
    }),
    __metadata("design:type", support_ticket_entity_1.SupportTicket)
], SupportTicketMessage.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['user', 'support'] }),
    __metadata("design:type", String)
], SupportTicketMessage.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SupportTicketMessage.prototype, "senderUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'senderUserId',
        foreignKeyConstraintName: 'FK_support_ticket_messages_sender',
    }),
    __metadata("design:type", user_entity_1.User)
], SupportTicketMessage.prototype, "senderUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SupportTicketMessage.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SupportTicketMessage.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicketMessage.prototype, "createdAt", void 0);
exports.SupportTicketMessage = SupportTicketMessage = __decorate([
    (0, typeorm_1.Entity)('support_ticket_messages'),
    (0, typeorm_1.Index)('IDX_support_ticket_messages_ticket_created', ['ticketId', 'createdAt'])
], SupportTicketMessage);
//# sourceMappingURL=support-ticket-message.entity.js.map