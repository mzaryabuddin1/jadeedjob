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
exports.StoredAsset = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let StoredAsset = class StoredAsset {
};
exports.StoredAsset = StoredAsset;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StoredAsset.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], StoredAsset.prototype, "ownerUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'ownerUserId',
        foreignKeyConstraintName: 'FK_stored_assets_owner',
    }),
    __metadata("design:type", user_entity_1.User)
], StoredAsset.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], StoredAsset.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['local', 's3'] }),
    __metadata("design:type", String)
], StoredAsset.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StoredAsset.prototype, "bucket", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500 }),
    __metadata("design:type", String)
], StoredAsset.prototype, "storageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], StoredAsset.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], StoredAsset.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", Number)
], StoredAsset.prototype, "sizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], StoredAsset.prototype, "sha256", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['public', 'private'], default: 'private' }),
    __metadata("design:type", String)
], StoredAsset.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], StoredAsset.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], StoredAsset.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StoredAsset.prototype, "createdAt", void 0);
exports.StoredAsset = StoredAsset = __decorate([
    (0, typeorm_1.Entity)('stored_assets'),
    (0, typeorm_1.Index)('IDX_stored_assets_owner_purpose', ['ownerUserId', 'purpose']),
    (0, typeorm_1.Index)('IDX_stored_assets_storage_key', ['storageKey'], { unique: true })
], StoredAsset);
//# sourceMappingURL=stored-asset.entity.js.map