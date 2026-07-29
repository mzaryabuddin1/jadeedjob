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
exports.AccountRecoveryController = exports.AccountDeletionController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const account_deletion_service_1 = require("./account-deletion.service");
let AccountDeletionController = class AccountDeletionController {
    constructor(deletionService) {
        this.deletionService = deletionService;
    }
    sendOtp(req) {
        return this.deletionService.sendDeletionOtp(req.user.id);
    }
    confirm(req, body) {
        return this.deletionService.confirmDeletion(req.user.id, body.otp);
    }
};
exports.AccountDeletionController = AccountDeletionController;
__decorate([
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountDeletionController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.HttpCode)(202),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({ otp: joi_1.default.string().trim().required() })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountDeletionController.prototype, "confirm", null);
exports.AccountDeletionController = AccountDeletionController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users/me/deletion'),
    __metadata("design:paramtypes", [account_deletion_service_1.AccountDeletionService])
], AccountDeletionController);
let AccountRecoveryController = class AccountRecoveryController {
    constructor(deletionService) {
        this.deletionService = deletionService;
    }
    sendOtp(body) {
        return this.deletionService.sendRecoveryOtp(body.phone);
    }
    confirm(body) {
        return this.deletionService.confirmRecovery(body.phone, body.otp, body);
    }
};
exports.AccountRecoveryController = AccountRecoveryController;
__decorate([
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({ phone: joi_1.default.string().trim().required() })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountRecoveryController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('confirm'),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().trim().required(),
        otp: joi_1.default.string().trim().required(),
        installationId: joi_1.default.string().trim().max(120).optional(),
        platform: joi_1.default.string()
            .valid('ios', 'android', 'web', 'unknown')
            .optional(),
        deviceName: joi_1.default.string().trim().max(120).allow('', null).optional(),
        appVersion: joi_1.default.string().trim().max(40).allow('', null).optional(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountRecoveryController.prototype, "confirm", null);
exports.AccountRecoveryController = AccountRecoveryController = __decorate([
    (0, common_1.Controller)('auth/account-recovery'),
    __metadata("design:paramtypes", [account_deletion_service_1.AccountDeletionService])
], AccountRecoveryController);
//# sourceMappingURL=account-deletion.controller.js.map