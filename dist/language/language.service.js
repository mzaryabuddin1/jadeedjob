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
exports.LanguageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const language_entity_1 = require("./entities/language.entity");
let LanguageService = class LanguageService {
    constructor(languageRepo) {
        this.languageRepo = languageRepo;
    }
    findAll() {
        return this.languageRepo.find();
    }
    async findOne(id) {
        const lang = await this.languageRepo.findOne({ where: { id } });
        if (!lang) {
            throw new common_1.NotFoundException('Language not found');
        }
        return lang;
    }
    create(data) {
        const lang = this.languageRepo.create(data);
        return this.languageRepo.save(lang);
    }
    async update(id, data) {
        const lang = await this.findOne(id);
        Object.assign(lang, data);
        return this.languageRepo.save(lang);
    }
    async delete(id) {
        const lang = await this.findOne(id);
        return this.languageRepo.remove(lang);
    }
};
exports.LanguageService = LanguageService;
exports.LanguageService = LanguageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(language_entity_1.Language)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LanguageService);
//# sourceMappingURL=language.service.js.map