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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaFile = void 0;
const typeorm_1 = require("typeorm");
let MediaFile = class MediaFile {
};
exports.MediaFile = MediaFile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MediaFile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MediaFile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 5 }),
    __metadata("design:type", String)
], MediaFile.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40 }),
    __metadata("design:type", String)
], MediaFile.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MediaFile.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], MediaFile.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], MediaFile.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], MediaFile.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MediaFile.prototype, "createdAt", void 0);
exports.MediaFile = MediaFile = __decorate([
    (0, typeorm_1.Entity)('media_files'),
    (0, typeorm_1.Index)('IDX_media_user_unused', ['userId', 'usedAt'])
], MediaFile);
//# sourceMappingURL=media-file.entity.js.map