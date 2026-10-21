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
exports.ConversationMessage = exports.MESSAGE_TYPES = void 0;
const typeorm_1 = require("typeorm");
exports.MESSAGE_TYPES = [
    'text',
    'image',
    'video',
    'audio',
    'file',
];
let ConversationMessage = class ConversationMessage {
};
exports.ConversationMessage = ConversationMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ConversationMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ConversationMessage.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ConversationMessage.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 8, default: 'text' }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2000, nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "mediaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "clientMsgId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "deletedAt", void 0);
exports.ConversationMessage = ConversationMessage = __decorate([
    (0, typeorm_1.Entity)('conversation_messages'),
    (0, typeorm_1.Index)('IDX_conv_msg_conv', ['conversationId', 'id']),
    (0, typeorm_1.Unique)('UQ_conv_msg_client', ['conversationId', 'senderId', 'clientMsgId'])
], ConversationMessage);
//# sourceMappingURL=conversation-message.entity.js.map