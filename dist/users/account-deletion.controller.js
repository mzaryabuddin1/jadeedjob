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
exports.PublicAccountDeletionController = exports.AccountRecoveryController = exports.AccountDeletionController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const account_deletion_service_1 = require("./account-deletion.service");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const api_error_dto_1 = require("../common/dto/api-error.dto");
const public_account_deletion_dto_1 = require("./dto/public-account-deletion.dto");
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
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 900_000 } }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountDeletionController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.HttpCode)(202),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 900_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({ otp: joi_1.default.string().trim().required() })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountDeletionController.prototype, "confirm", null);
exports.AccountDeletionController = AccountDeletionController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users/me/deletion'),
    (0, swagger_1.ApiTags)('Account deletion'),
    (0, swagger_1.ApiBearerAuth)(),
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
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 3_600_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({ phone: joi_1.default.string().trim().required() })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountRecoveryController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 900_000 } }),
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
    (0, swagger_1.ApiTags)('Account recovery'),
    __metadata("design:paramtypes", [account_deletion_service_1.AccountDeletionService])
], AccountRecoveryController);
let PublicAccountDeletionController = class PublicAccountDeletionController {
    constructor(deletionService) {
        this.deletionService = deletionService;
    }
    sendOtp(body) {
        return this.deletionService.sendPublicDeletionOtp(body.phone);
    }
    confirm(body) {
        return this.deletionService.confirmPublicDeletion(body.phone, body.otp);
    }
};
exports.PublicAccountDeletionController = PublicAccountDeletionController;
__decorate([
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(202),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 3_600_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Send an enumeration-safe deletion OTP challenge' }),
    (0, swagger_1.ApiBody)({ type: public_account_deletion_dto_1.PublicAccountDeletionSendOtpDto }),
    (0, swagger_1.ApiAcceptedResponse)({
        schema: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({ phone: joi_1.default.string().trim().required() })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicAccountDeletionController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.HttpCode)(202),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 900_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm and schedule public account deletion' }),
    (0, swagger_1.ApiBody)({ type: public_account_deletion_dto_1.PublicAccountDeletionConfirmDto }),
    (0, swagger_1.ApiAcceptedResponse)({
        schema: {
            oneOf: [
                { $ref: '#/components/schemas/ScheduledAccountDeletionDto' },
                { $ref: '#/components/schemas/BlockedAccountDeletionDto' },
            ],
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({
        description: 'Invalid, unknown, expired, or consumed deletion OTP.',
        type: api_error_dto_1.ApiErrorDto,
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().trim().required(),
        otp: joi_1.default.string().trim().required(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicAccountDeletionController.prototype, "confirm", null);
exports.PublicAccountDeletionController = PublicAccountDeletionController = __decorate([
    (0, common_1.Controller)('public/account-deletion'),
    (0, swagger_1.ApiTags)('Account deletion'),
    (0, swagger_1.ApiExtraModels)(public_account_deletion_dto_1.ScheduledAccountDeletionDto, public_account_deletion_dto_1.BlockedAccountDeletionDto),
    __metadata("design:paramtypes", [account_deletion_service_1.AccountDeletionService])
], PublicAccountDeletionController);
//# sourceMappingURL=account-deletion.controller.js.map