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
exports.UserLanguage = exports.LANGUAGE_LEVELS = void 0;
const typeorm_1 = require("typeorm");
exports.LANGUAGE_LEVELS = [
    'basic',
    'conversational',
    'fluent',
    'native',
];
let UserLanguage = class UserLanguage {
};
exports.UserLanguage = UserLanguage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserLanguage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], UserLanguage.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 60 }),
    __metadata("design:type", String)
], UserLanguage.prototype, "language_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 60 }),
    __metadata("design:type", String)
], UserLanguage.prototype, "languageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], UserLanguage.prototype, "proficiency", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserLanguage.prototype, "createdAt", void 0);
exports.UserLanguage = UserLanguage = __decorate([
    (0, typeorm_1.Entity)('user_languages'),
    (0, typeorm_1.Unique)('UQ_user_language', ['userId', 'languageKey']),
    (0, typeorm_1.Index)('IDX_user_language_user', ['userId'])
], UserLanguage);
//# sourceMappingURL=user-language.entity.js.map