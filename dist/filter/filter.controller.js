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
exports.FilterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const filter_service_1 = require("./filter.service");
const auth_service_1 = require("../auth/auth.service");
let FilterController = class FilterController {
    constructor(filterService, authService) {
        this.filterService = filterService;
        this.authService = authService;
    }
    async getFilter(req, query) {
        const userId = this.authService.tryGetUserIdFromAuthHeader(req.headers?.authorization) ??
            undefined;
        return this.filterService.getFilters(query, {
            approvedOnly: true,
            userId,
        });
    }
    async getFilterById(id) {
        return this.filterService.filterById(Number(id), { approvedOnly: true });
    }
};
exports.FilterController = FilterController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, swagger_1.ApiOperation)({
        summary: 'List approved filters',
        description: [
            'Returns approved + active filters.',
            'Each `icon` is either `{ type: "tabler", name }` or `{ type: "custom", svg }`.',
            'Use `last_update_time` (ISO) for React Native cache invalidation.',
            'Optional Authorization: Bearer — preferred filters first.',
        ].join(' '),
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getFilter", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get filter by id',
        description: 'Includes `last_update_time` and normalized `icon` (tabler | custom).',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FilterController.prototype, "getFilterById", null);
exports.FilterController = FilterController = __decorate([
    (0, swagger_1.ApiTags)('Filters'),
    (0, common_1.Controller)('filters'),
    __metadata("design:paramtypes", [filter_service_1.FilterService,
        auth_service_1.AuthService])
], FilterController);
//# sourceMappingURL=filter.controller.js.map