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
exports.PageInvitation = void 0;
const typeorm_1 = require("typeorm");
const page_entity_1 = require("./page.entity");
let PageInvitation = class PageInvitation {
};
exports.PageInvitation = PageInvitation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PageInvitation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PageInvitation.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => page_entity_1.Page, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pageId' }),
    __metadata("design:type", page_entity_1.Page)
], PageInvitation.prototype, "page", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PageInvitation.prototype, "invitedUserId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PageInvitation.prototype, "invitedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], PageInvitation.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'pending' }),
    __metadata("design:type", String)
], PageInvitation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], PageInvitation.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], PageInvitation.prototype, "respondedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PageInvitation.prototype, "createdAt", void 0);
exports.PageInvitation = PageInvitation = __decorate([
    (0, typeorm_1.Entity)('page_invitations'),
    (0, typeorm_1.Index)('IDX_page_invitation_user_status', ['invitedUserId', 'status']),
    (0, typeorm_1.Index)('IDX_page_invitation_page_status', ['pageId', 'status'])
], PageInvitation);
//# sourceMappingURL=page-invitation.entity.js.map