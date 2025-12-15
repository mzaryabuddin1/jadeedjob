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
exports.OrganizationController = void 0;
const common_1 = require("@nestjs/common");
const organization_service_1 = require("./organization.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
let OrganizationController = class OrganizationController {
    constructor(orgService) {
        this.orgService = orgService;
    }
    async create(body, req) {
        return this.orgService.createOrg({
            ...body,
            createdBy: req.user.id,
        });
    }
    async addMember(body, req) {
        return this.orgService.addMember(body.organization, { userId: body.user, role: body.role }, req.user.id);
    }
    async removeMember(body, req) {
        return this.orgService.removeMember(body.organization, body.user, req.user.id);
    }
    async getOrganizations(req, mine, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC') {
        return this.orgService.getOrganizations({
            userId: req.user.id,
            mine: mine === 'true',
            search,
            page: Number(page),
            limit: Number(limit),
            sortBy,
            sortOrder: sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
        });
    }
};
exports.OrganizationController = OrganizationController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().required(),
        industry: joi_1.default.string().required(),
        username: joi_1.default.string()
            .regex(/^[a-z0-9.-]+$/)
            .min(3)
            .max(50)
            .optional(),
        members: joi_1.default.array()
            .items(joi_1.default.object({
            user: joi_1.default.number().required(),
            role: joi_1.default.string().valid('admin', 'user').default('user'),
        }))
            .optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('member'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        organization: joi_1.default.number().required(),
        user: joi_1.default.number().required(),
        role: joi_1.default.string().valid('admin', 'user').required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "addMember", null);
__decorate([
    (0, common_1.Delete)('member/remove'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        organization: joi_1.default.number().required(),
        user: joi_1.default.number().required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('mine')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('sortBy')),
    __param(6, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getOrganizations", null);
exports.OrganizationController = OrganizationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('organization'),
    __metadata("design:paramtypes", [organization_service_1.OrganizationService])
], OrganizationController);
//# sourceMappingURL=organization.controller.js.map