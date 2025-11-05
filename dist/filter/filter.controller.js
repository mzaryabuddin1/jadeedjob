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
exports.FilterController = void 0;
const common_1 = require("@nestjs/common");
const filter_service_1 = require("./filter.service");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const utils_util_1 = require("../common/utils/utils.util");
const filter_schema_1 = require("./filter.schema");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
let FilterController = class FilterController {
    constructor(filterService, filterModel) {
        this.filterService = filterService;
        this.filterModel = filterModel;
    }
    async createFilter(body, req) {
        body.name = (0, utils_util_1.toSentenceCase)(body.name);
        const existing = await this.filterModel.findOne({
            name: { $regex: `^${body.name}$`, $options: 'i' },
        });
        if (existing) {
            throw new common_1.BadRequestException('Filter with this name already exists');
        }
        const createdFilter = await this.filterService.createFilter({
            ...body,
            approvalStatus: 'pending',
            rejectionReason: null,
            createdBy: req.user.id,
        });
        return {
            message: 'Filter submitted for review',
            filter: createdFilter,
        };
    }
    async getFilter(query) {
        const result = await this.filterService.getFilters(query);
        return result;
    }
    async getCountryById(params) {
        return this.filterService.FilterById(params.id);
    }
};
exports.FilterController = FilterController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().required(),
        status: joi_1.default.string().valid('active', 'inactive').default('active'),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "createFilter", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        search: joi_1.default.string().allow('').optional(),
        preference_ids: joi_1.default.array().items(joi_1.default.string().length(24)).optional(),
        approvalStatus: joi_1.default.string()
            .valid('pending', 'approved', 'rejected')
            .optional(),
        createdBy: joi_1.default.string().length(24).optional(),
        sortBy: joi_1.default.string()
            .valid('name', 'icon', 'status', 'approvalStatus', 'createdAt')
            .optional(),
        sortOrder: joi_1.default.string().valid('asc', 'desc').optional(),
    }))),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getFilter", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        id: joi_1.default.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
            'string.pattern.base': 'Invalid country ID format',
        }),
    }))),
    __param(0, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getCountryById", null);
exports.FilterController = FilterController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('filters'),
    __param(1, (0, mongoose_2.InjectModel)(filter_schema_1.Filter.name)),
    __metadata("design:paramtypes", [filter_service_1.FilterService,
        mongoose_1.Model])
], FilterController);
//# sourceMappingURL=filter.controller.js.map