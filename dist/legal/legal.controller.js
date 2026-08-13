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
exports.UserLegalAcceptancesController = exports.LegalController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const legal_service_1 = require("./legal.service");
const swagger_1 = require("@nestjs/swagger");
const legal_api_dto_1 = require("./dto/legal-api.dto");
const acceptanceSchema = joi_1.default.object({
    acceptances: joi_1.default.array()
        .items(joi_1.default.object({
        documentType: joi_1.default.string()
            .valid('terms', 'privacy', 'community_guidelines')
            .required(),
        version: joi_1.default.string().trim().min(1).max(80).required(),
    }))
        .min(1)
        .max(3)
        .required(),
    clientPlatform: joi_1.default.string()
        .valid('ios', 'android', 'web', 'unknown')
        .required(),
});
let LegalController = class LegalController {
    constructor(legalService) {
        this.legalService = legalService;
    }
    current() {
        return this.legalService.getCurrentDocuments();
    }
};
exports.LegalController = LegalController;
__decorate([
    (0, common_1.Get)('current'),
    (0, swagger_1.ApiOperation)({ summary: 'List current published legal documents' }),
    (0, swagger_1.ApiOkResponse)({
        schema: {
            type: 'object',
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "current", null);
exports.LegalController = LegalController = __decorate([
    (0, common_1.Controller)('legal'),
    (0, swagger_1.ApiTags)('Legal'),
    (0, swagger_1.ApiExtraModels)(legal_api_dto_1.LegalDocumentDto, legal_api_dto_1.UserLegalAcceptanceDto),
    __metadata("design:paramtypes", [legal_service_1.LegalService])
], LegalController);
let UserLegalAcceptancesController = class UserLegalAcceptancesController {
    constructor(legalService) {
        this.legalService = legalService;
    }
    list(req) {
        return this.legalService.getUserAcceptances(req.user.id);
    }
    accept(req, body) {
        return this.legalService.acceptDocuments(req.user.id, body.acceptances, body.clientPlatform);
    }
};
exports.UserLegalAcceptancesController = UserLegalAcceptancesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List the current user legal acceptances' }),
    (0, swagger_1.ApiOkResponse)({
        schema: {
            type: 'object',
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/UserLegalAcceptanceDto' } },
                current: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
                missingCurrent: { type: 'array', items: { type: 'object' } },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserLegalAcceptancesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Accept current legal document versions' }),
    (0, swagger_1.ApiBody)({ type: legal_api_dto_1.SubmitLegalAcceptancesDto }),
    (0, swagger_1.ApiOkResponse)({
        schema: {
            type: 'object',
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/UserLegalAcceptanceDto' } },
                current: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
                missingCurrent: { type: 'array', items: { type: 'object' } },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(acceptanceSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UserLegalAcceptancesController.prototype, "accept", null);
exports.UserLegalAcceptancesController = UserLegalAcceptancesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users/me/legal-acceptances'),
    (0, swagger_1.ApiTags)('Legal'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiExtraModels)(legal_api_dto_1.LegalDocumentDto, legal_api_dto_1.UserLegalAcceptanceDto),
    __metadata("design:paramtypes", [legal_service_1.LegalService])
], UserLegalAcceptancesController);
//# sourceMappingURL=legal.controller.js.map