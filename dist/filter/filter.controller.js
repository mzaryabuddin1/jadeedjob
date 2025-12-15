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
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const filter_entity_1 = require("./entities/filter.entity");
let FilterController = class FilterController {
    constructor(filterService, filterRepo) {
        this.filterService = filterService;
        this.filterRepo = filterRepo;
    }
    async createFilter(body, req) {
        body.name = (0, utils_util_1.toSentenceCase)(body.name);
        const existing = await this.filterRepo.findOne({
            where: { name: body.name },
        });
        if (existing) {
            throw new common_1.BadRequestException('Filter with this name already exists');
        }
        const createdFilter = await this.filterService.createFilter({
            ...body,
            createdBy: Number(req.user.id),
        });
        return {
            message: 'Filter submitted for review',
            filter: createdFilter,
        };
    }
    async getFilter(query) {
        return this.filterService.getFilters(query);
    }
    async getFilterById(params) {
        return this.filterService.filterById(Number(params.id));
    }
};
exports.FilterController = FilterController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().trim().required(),
        icon: joi_1.default.string().trim().pattern(/^\{\s*icon:\s*'[^']+'\s*\}$/).required(),
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
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getFilter", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getFilterById", null);
exports.FilterController = FilterController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('filters'),
    __param(1, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [filter_service_1.FilterService,
        typeorm_2.Repository])
], FilterController);
//# sourceMappingURL=filter.controller.js.map