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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPageVerificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const fs_1 = require("fs");
const admin_key_guard_1 = require("./admin-key.guard");
const page_verification_service_1 = require("./page-verification.service");
let AdminPageVerificationController = class AdminPageVerificationController {
    constructor(service) {
        this.service = service;
    }
    reviewer(req) {
        return (String(req.headers['x-admin-name'] ?? 'admin')
            .trim()
            .slice(0, 60) || 'admin');
    }
    list(status, limit = '50') {
        return this.service.adminList(status, Number(limit) || 50);
    }
    get(id) {
        return this.service.adminGet(id);
    }
    async document(id, index) {
        const { path, doc } = await this.service.adminDocument(id, index);
        return new common_1.StreamableFile((0, fs_1.createReadStream)(path), {
            type: doc.mimeType,
            disposition: `inline; filename="${doc.originalName.replace(/"/g, '')}"`,
        });
    }
    approve(id, req) {
        return this.service.approve(id, this.reviewer(req));
    }
    reject(id, body, req) {
        const reason = String(body?.reason ?? '').trim();
        if (reason.length < 3 || reason.length > 500) {
            throw new common_1.BadRequestException('Give a reason (3-500 characters)');
        }
        return this.service.reject(id, reason, this.reviewer(req));
    }
    unverify(pageId, body, req) {
        const reason = String(body?.reason ?? '').trim();
        if (reason.length < 3 || reason.length > 500) {
            throw new common_1.BadRequestException('Give a reason (3-500 characters)');
        }
        return this.service.unverify(pageId, reason, this.reviewer(req));
    }
};
exports.AdminPageVerificationController = AdminPageVerificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminPageVerificationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminPageVerificationController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/documents/:index'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('index', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], AdminPageVerificationController.prototype, "document", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdminPageVerificationController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPageVerificationController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('pages/:pageId/unverify'),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPageVerificationController.prototype, "unverify", null);
exports.AdminPageVerificationController = AdminPageVerificationController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.UseGuards)(admin_key_guard_1.AdminKeyGuard),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }),
    (0, common_1.Controller)('admin/page-verifications'),
    __metadata("design:paramtypes", [page_verification_service_1.PageVerificationService])
], AdminPageVerificationController);
//# sourceMappingURL=admin-page-verification.controller.js.map