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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = exports.MULTER_HARD_LIMIT = exports.maxVideoBytes = exports.maxImageBytes = exports.extensionFor = exports.allowedMimeTypes = exports.MEDIA_DIR = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
const typeorm_2 = require("typeorm");
const media_file_entity_1 = require("./media-file.entity");
exports.MEDIA_DIR = './uploads/media';
const ALLOWED = {
    'image/jpeg': { kind: 'image', sniff: 'jpeg', ext: '.jpg' },
    'image/png': { kind: 'image', sniff: 'png', ext: '.png' },
    'image/webp': { kind: 'image', sniff: 'webp', ext: '.webp' },
    'image/gif': { kind: 'image', sniff: 'gif', ext: '.gif' },
    'video/mp4': { kind: 'video', sniff: 'mp4', ext: '.mp4' },
    'video/quicktime': { kind: 'video', sniff: 'mp4', ext: '.mov' },
    'video/webm': { kind: 'video', sniff: 'webm', ext: '.webm' },
};
const allowedMimeTypes = () => Object.keys(ALLOWED);
exports.allowedMimeTypes = allowedMimeTypes;
const extensionFor = (mime) => ALLOWED[mime]?.ext ?? '';
exports.extensionFor = extensionFor;
const mb = (n) => n * 1024 * 1024;
const maxImageBytes = () => mb(Number(process.env.MEDIA_MAX_IMAGE_MB) || 10);
exports.maxImageBytes = maxImageBytes;
const maxVideoBytes = () => mb(Number(process.env.MEDIA_MAX_VIDEO_MB) || 100);
exports.maxVideoBytes = maxVideoBytes;
exports.MULTER_HARD_LIMIT = mb(500);
function sniffMatches(path, expected) {
    const fd = (0, fs_1.openSync)(path, 'r');
    const buf = Buffer.alloc(16);
    try {
        (0, fs_1.readSync)(fd, buf, 0, 16, 0);
    }
    finally {
        (0, fs_1.closeSync)(fd);
    }
    switch (expected) {
        case 'jpeg':
            return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        case 'png':
            return buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
        case 'gif':
            return buf.subarray(0, 4).toString('ascii') === 'GIF8';
        case 'webp':
            return (buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
                buf.subarray(8, 12).toString('ascii') === 'WEBP');
        case 'mp4':
            return buf.subarray(4, 8).toString('ascii') === 'ftyp';
        case 'webm':
            return buf.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
    }
}
let MediaService = MediaService_1 = class MediaService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(MediaService_1.name);
        this.timer = null;
    }
    publicUrl(filename) {
        return `${process.env.APP_URL || 'http://localhost:3000'}/uploads/media/${filename}`;
    }
    async register(userId, file) {
        const spec = ALLOWED[file.mimetype];
        try {
            if (!spec)
                throw new common_1.BadRequestException('Unsupported file type');
            if (!sniffMatches(file.path, spec.sniff)) {
                throw new common_1.BadRequestException('The file content does not match its type');
            }
            const max = spec.kind === 'image' ? (0, exports.maxImageBytes)() : (0, exports.maxVideoBytes)();
            if (file.size > max) {
                throw new common_1.BadRequestException(`${spec.kind === 'image' ? 'Images' : 'Videos'} can be at most ${Math.round(max / 1048576)} MB`);
            }
        }
        catch (err) {
            await this.unlink(file.filename);
            throw err;
        }
        const saved = await this.repo.save(this.repo.create({
            userId,
            kind: spec.kind,
            mimeType: file.mimetype,
            size: file.size,
            filename: file.filename,
            url: this.publicUrl(file.filename),
            usedAt: null,
        }));
        return this.view(saved);
    }
    view(m) {
        return {
            id: m.id,
            kind: m.kind,
            url: m.url,
            mimeType: m.mimeType,
            size: m.size,
        };
    }
    async claim(userId, ids, manager) {
        if (!ids.length)
            return [];
        const repo = manager ? manager.getRepository(media_file_entity_1.MediaFile) : this.repo;
        const rows = await repo.find({
            where: { id: (0, typeorm_2.In)(ids), userId, usedAt: (0, typeorm_2.IsNull)() },
        });
        if (rows.length !== new Set(ids).size) {
            throw new common_1.BadRequestException('Some media files do not exist, are not yours, or were already used');
        }
        await repo.update({ id: (0, typeorm_2.In)(ids) }, { usedAt: new Date() });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids.map((id) => byId.get(id));
    }
    async deleteUnused(userId, id) {
        const row = await this.repo.findOne({ where: { id, userId } });
        if (!row)
            throw new common_1.NotFoundException('File not found');
        if (row.usedAt) {
            throw new common_1.BadRequestException('This file is used by a post');
        }
        await this.unlink(row.filename);
        await this.repo.delete(id);
        return { message: 'File deleted' };
    }
    onModuleInit() {
        if (process.env.NOTIFICATION_WORKER === 'off')
            return;
        this.timer = setInterval(() => void this.cleanup(), 60 * 60 * 1000);
        this.timer.unref?.();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async cleanup() {
        try {
            const old = await this.repo.find({
                where: {
                    usedAt: (0, typeorm_2.IsNull)(),
                    createdAt: (0, typeorm_2.LessThan)(new Date(Date.now() - 24 * 60 * 60 * 1000)),
                },
                take: 500,
            });
            for (const row of old)
                await this.unlink(row.filename);
            if (old.length) {
                await this.repo.delete(old.map((r) => r.id));
                this.logger.log(`Removed ${old.length} abandoned upload(s)`);
            }
        }
        catch (err) {
            this.logger.error(`Media cleanup failed: ${err?.message}`);
        }
    }
    async unlink(filename) {
        try {
            await fs_1.promises.unlink((0, path_1.join)(exports.MEDIA_DIR, filename));
        }
        catch {
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(media_file_entity_1.MediaFile)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MediaService);
//# sourceMappingURL=media.service.js.map