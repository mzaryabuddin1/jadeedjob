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
const filterIconSchema = {
    oneOf: [
        {
            type: 'object',
            required: ['type', 'name'],
            properties: {
                type: { type: 'string', enum: ['tabler'], example: 'tabler' },
                name: {
                    type: 'string',
                    example: 'briefcase',
                    description: 'Tabler icon slug for RN `@tabler/icons-react-native` (e.g. briefcase → IconBriefcase)',
                },
            },
        },
        {
            type: 'object',
            required: ['type', 'svg'],
            properties: {
                type: { type: 'string', enum: ['custom'], example: 'custom' },
                svg: {
                    type: 'string',
                    example: '<svg viewBox="0 0 24 24">...</svg>',
                },
            },
        },
    ],
};
const filterItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'number', example: 15 },
        name: { type: 'string', example: 'Office helper' },
        icon: filterIconSchema,
        status: { type: 'string', example: 'active' },
        approvalStatus: { type: 'string', example: 'approved' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
};
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
            'Returns **approved + active** job category filters.',
            '',
            '### Icon',
            '- Tabler: `{ "type": "tabler", "name": "briefcase" }` → parse with `@tabler/icons-react-native`',
            '- Custom: `{ "type": "custom", "svg": "<svg>...</svg>" }`',
            '',
            '### Cache (React Native)',
            'Compare `last_update_time` (ISO) with local cache. If newer → re-fetch and re-cache.',
            '',
            '### Preferences order',
            'Optional `Authorization: Bearer <token>`. When logged in and `preference` ≠ false, your `filter_preferences` appear first.',
            'Seed: `npm run seed:filters`',
        ].join('\n'),
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        example: 20,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        description: 'Search by filter name',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        type: String,
        example: 'createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        enum: ['ASC', 'DESC'],
        example: 'DESC',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'preference',
        required: false,
        type: Boolean,
        description: 'Default true. When Bearer present, preferred filters first. Set false to skip.',
        example: true,
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Paginated filters with cache timestamp',
        schema: {
            type: 'object',
            properties: {
                last_update_time: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-10-10T16:09:41.926Z',
                    description: 'Max updatedAt of listed filters — use for client cache invalidation',
                },
                data: {
                    type: 'array',
                    items: filterItemSchema,
                },
                total: { type: 'number', example: 25 },
                totalPages: { type: 'number', example: 2 },
                currentPage: { type: 'number', example: 1 },
            },
        },
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
        description: 'Returns one approved + active filter with normalized `icon` and global `last_update_time`.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 15 }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Filter detail',
        schema: {
            type: 'object',
            properties: {
                last_update_time: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                },
                filter: filterItemSchema,
            },
        },
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