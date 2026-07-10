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
    async seedFilters(req) {
        const FAKE_FILTERS = [
            { iconLibrary: 'Feather', iconName: 'tool', name: 'Labor' },
            { iconLibrary: 'FontAwesome5', iconName: 'broom', name: 'Housekeeping' },
            { iconLibrary: 'FontAwesome5', iconName: 'motorcycle', name: 'Delivery' },
            { iconLibrary: 'FontAwesome5', iconName: 'utensils', name: 'Kitchen' },
            { iconLibrary: 'Feather', iconName: 'file-text', name: 'Admin' },
            { iconLibrary: 'Feather', iconName: 'more-horizontal', name: 'Other' },
            { iconLibrary: 'Feather', iconName: 'zap', name: 'Electrician' },
            { iconLibrary: 'FontAwesome5', iconName: 'faucet', name: 'Plumber' },
            { iconLibrary: 'FontAwesome5', iconName: 'car', name: 'Driver' },
            {
                iconLibrary: 'FontAwesome5',
                iconName: 'paint-roller',
                name: 'Painter',
            },
            { iconLibrary: 'Feather', iconName: 'shield', name: 'Security' },
            { iconLibrary: 'FontAwesome5', iconName: 'truck', name: 'Loader' },
            { iconLibrary: 'FontAwesome5', iconName: 'utensils', name: 'Cook' },
            { iconLibrary: 'Feather', iconName: 'settings', name: 'Mechanic' },
            { iconLibrary: 'FontAwesome5', iconName: 'spray-can', name: 'Cleaner' },
            { iconLibrary: 'Feather', iconName: 'briefcase', name: 'Office Helper' },
        ];
        const created = [];
        for (const item of FAKE_FILTERS) {
            const name = (0, utils_util_1.toSentenceCase)(item.name);
            const existing = await this.filterRepo.findOne({
                where: { name },
            });
            if (existing)
                continue;
            const filter = await this.filterService.createFilter({
                name,
                iconSource: 'library',
                iconLibrary: item.iconLibrary,
                iconName: item.iconName,
                icon: item.iconName,
                iconColor: '#2F6F73',
                status: 'active',
                createdBy: Number(req.user.id),
            });
            created.push(filter);
        }
        return {
            message: 'Fake filters seeded successfully',
            count: created.length,
            filters: created,
        };
    }
};
exports.FilterController = FilterController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().trim().required(),
        icon: joi_1.default.string().trim().optional(),
        iconSource: joi_1.default.string().valid('library', 'svg').default('library'),
        iconLibrary: joi_1.default.when('iconSource', {
            is: 'library',
            then: joi_1.default.string()
                .valid('Feather', 'FontAwesome', 'FontAwesome5')
                .required(),
            otherwise: joi_1.default.forbidden(),
        }),
        iconName: joi_1.default.when('iconSource', {
            is: 'library',
            then: joi_1.default.string().trim().required(),
            otherwise: joi_1.default.forbidden(),
        }),
        iconColor: joi_1.default.string()
            .trim()
            .pattern(/^#(?:[0-9a-fA-F]{3}){1,2}$/)
            .default('#2F6F73'),
        iconSvgUrl: joi_1.default.forbidden(),
        iconSvg: joi_1.default.when('iconSource', {
            is: 'svg',
            then: joi_1.default.string().max(8000).required(),
            otherwise: joi_1.default.forbidden(),
        }),
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
        sortBy: joi_1.default.string()
            .valid('id', 'name', 'status', 'approvalStatus', 'createdAt', 'updatedAt')
            .default('createdAt'),
        sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
        approvalStatus: joi_1.default.string()
            .valid('pending', 'approved', 'rejected')
            .optional(),
        status: joi_1.default.string().valid('active', 'inactive').optional(),
        createdBy: joi_1.default.number().integer().optional(),
        preference: joi_1.default.boolean().default(true),
    }))),
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
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "seedFilters", null);
exports.FilterController = FilterController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('filters'),
    __param(1, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [filter_service_1.FilterService,
        typeorm_2.Repository])
], FilterController);
//# sourceMappingURL=filter.controller.js.map