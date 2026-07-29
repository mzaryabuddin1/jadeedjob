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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const push_service_1 = require("./push.service");
const deviceSchema = joi_1.default.object({
    installationId: joi_1.default.string().trim().max(120).required(),
    token: joi_1.default.string().trim().max(512).required(),
    platform: joi_1.default.string().valid('ios', 'android').required(),
    appVersion: joi_1.default.string().trim().max(40).allow('', null).optional(),
    locale: joi_1.default.string().trim().max(20).allow('', null).optional(),
});
const preferencesSchema = joi_1.default.object({
    enabled: joi_1.default.boolean().optional(),
    jobs: joi_1.default.boolean().optional(),
    applications: joi_1.default.boolean().optional(),
    messages: joi_1.default.boolean().optional(),
    community: joi_1.default.boolean().optional(),
    videos: joi_1.default.boolean().optional(),
    company: joi_1.default.boolean().optional(),
    support: joi_1.default.boolean().optional(),
}).min(1);
const devicePatchSchema = joi_1.default.object({
    token: joi_1.default.string().trim().max(512).optional(),
    platform: joi_1.default.string().valid('ios', 'android').optional(),
    appVersion: joi_1.default.string().trim().max(40).allow('', null).optional(),
    locale: joi_1.default.string().trim().max(20).allow('', null).optional(),
}).min(1);
let PushController = class PushController {
    constructor(pushService) {
        this.pushService = pushService;
    }
    list(req) {
        return this.pushService.listDevices(req.user.id);
    }
    register(req, body) {
        return this.pushService.upsertDevice(req.user.id, body);
    }
    update(req, installationId, body) {
        return this.pushService.updateDevice(req.user.id, installationId, body);
    }
    remove(req, installationId) {
        return this.pushService.removeDevice(req.user.id, installationId);
    }
    getPreferences(req) {
        return this.pushService.getPreferences(req.user.id);
    }
    updatePreferences(req, body) {
        return this.pushService.updatePreferences(req.user.id, body);
    }
};
exports.PushController = PushController;
__decorate([
    (0, common_1.Get)('push-devices'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('push-devices'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(deviceSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "register", null);
__decorate([
    (0, common_1.Patch)('push-devices/:installationId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('installationId')),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(devicePatchSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('push-devices/:installationId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('installationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('notification-preferences'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Patch)('notification-preferences'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(preferencesSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "updatePreferences", null);
exports.PushController = PushController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users/me'),
    __metadata("design:paramtypes", [push_service_1.PushService])
], PushController);
//# sourceMappingURL=push.controller.js.map