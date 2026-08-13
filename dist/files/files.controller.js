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
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const files_service_1 = require("./files.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const object_storage_service_1 = require("../storage/object-storage.service");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const file_upload_response_dto_1 = require("./dto/file-upload-response.dto");
let FilesController = class FilesController {
    constructor(filesService, storageService) {
        this.filesService = filesService;
        this.storageService = storageService;
    }
    async uploadFile(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const asset = await this.storageService.store({
            ownerUserId: req.user.id,
            purpose: 'general-uploads',
            file,
            allowedTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
                'video/mp4',
                'video/quicktime',
                'audio/mpeg',
                'audio/mp4',
            ],
            maxBytes: 20 * 1024 * 1024,
            visibility: 'private',
            metadata: { source: 'files/upload' },
        });
        const fileUrl = await this.storageService.getUrl(asset);
        return {
            message: 'File uploaded successfully',
            fileName: asset.originalName,
            fileUrl,
            assetId: asset.id,
            contentType: asset.contentType,
            sizeBytes: Number(asset.sizeBytes),
        };
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 600_000 } }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Upload an authenticated private asset' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    (0, swagger_1.ApiCreatedResponse)({ type: file_upload_response_dto_1.FileUploadResponseDto }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "uploadFile", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.Controller)('files'),
    (0, swagger_1.ApiTags)('Files'),
    __metadata("design:paramtypes", [files_service_1.FilesService,
        object_storage_service_1.ObjectStorageService])
], FilesController);
//# sourceMappingURL=files.controller.js.map