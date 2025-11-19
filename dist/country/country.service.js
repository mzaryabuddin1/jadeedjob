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
exports.CountryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const country_entity_1 = require("./entities/country.entity");
let CountryService = class CountryService {
    constructor(countryRepo) {
        this.countryRepo = countryRepo;
    }
    async getAllCountries(options) {
        const { limit = 20, page = 1, search = '', sortBy = 'name', sortOrder = 'asc', } = options;
        const skip = (page - 1) * limit;
        const where = {
            isActive: true,
            ...(search
                ? { name: (0, typeorm_2.Like)(`%${search}%`) }
                : {}),
        };
        const order = {
            [sortBy]: sortOrder.toUpperCase(),
        };
        const [data, total] = await this.countryRepo.findAndCount({
            where,
            order,
            skip,
            take: limit,
        });
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async getCountryById(id) {
        const country = await this.countryRepo.findOne({
            where: { id },
        });
        if (!country) {
            throw new common_1.NotFoundException('Country not found');
        }
        return country;
    }
};
exports.CountryService = CountryService;
exports.CountryService = CountryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CountryService);
//# sourceMappingURL=country.service.js.map