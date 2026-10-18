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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const media_service_1 = require("./media.service");
let MediaController = class MediaController {
    constructor(media) {
        this.media = media;
    }
    upload(file, req) {
        if (!file)
            throw new common_1.BadRequestException('No file provided (field: file)');
        return this.media.register(req.user.id, file);
    }
    remove(id, req) {
        return this.media.deleteUnused(req.user.id, id);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload an image or video for a post / reel',
        description: [
            'Multipart field `file`. Images: JPG, PNG, WEBP, GIF (max 10 MB). Videos: MP4, MOV, WEBM (max 100 MB). The real file content is checked, not only its name.',
            'Returns `{ id, kind, url, mimeType, size }`. Send the `id` in `mediaIds` of `POST /posts` (a reel needs exactly one video; send an image id as `thumbnailMediaId` for the cover).',
            'Files that no post uses within 24 hours are deleted automatically. Videos support seeking (HTTP range requests).',
        ].join('\n'),
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: media_service_1.MEDIA_DIR,
            filename: (req, file, cb) => cb(null, `${req.user?.id ?? 0}-${Date.now()}-${Math.round(Math.random() * 1e9)}${(0, media_service_1.extensionFor)(file.mimetype)}`),
        }),
        fileFilter: (_req, file, cb) => {
            if (!(0, media_service_1.allowedMimeTypes)().includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Only JPG, PNG, WEBP, GIF images and MP4, MOV, WEBM videos are allowed'), false);
            }
            cb(null, true);
        },
        limits: { files: 1, fileSize: media_service_1.MULTER_HARD_LIMIT },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "upload", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete an uploaded file that no post uses yet',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "remove", null);
exports.MediaController = MediaController = __decorate([
    (0, swagger_1.ApiTags)('Media'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }),
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map