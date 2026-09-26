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
exports.CityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const city_entity_1 = require("./entities/city.entity");
const country_entity_1 = require("../country/entities/country.entity");
const seed_cities_data_1 = require("./seed-cities.data");
let CityService = class CityService {
    constructor(cityRepo, countryRepo) {
        this.cityRepo = cityRepo;
        this.countryRepo = countryRepo;
    }
    async getCities(options) {
        const { countryId, page = 1, limit = 50, search = '' } = options;
        const where = {};
        if (countryId)
            where.countryId = Number(countryId);
        if (search)
            where.name = (0, typeorm_2.Like)(`%${search}%`);
        const [data, total] = await this.cityRepo.findAndCount({
            where,
            order: { name: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async getCityById(id) {
        const city = await this.cityRepo.findOne({ where: { id } });
        if (!city)
            throw new common_1.NotFoundException('City not found');
        return city;
    }
    async seedPakistanCities() {
        let country = await this.countryRepo.findOne({
            where: { code: 'PK' },
        });
        if (!country) {
            country = await this.countryRepo.findOne({
                where: { name: 'Pakistan' },
            });
        }
        if (!country) {
            throw new common_1.NotFoundException('Pakistan country not found. Run npm run seed:countries first.');
        }
        const created = [];
        const skipped = [];
        for (const name of seed_cities_data_1.SEED_PAKISTAN_CITIES) {
            const existing = await this.cityRepo.findOne({
                where: { name, countryId: country.id },
            });
            if (existing) {
                skipped.push(name);
                continue;
            }
            const city = await this.cityRepo.save(this.cityRepo.create({
                name,
                countryId: country.id,
                country,
            }));
            created.push(city);
        }
        return { created, skipped, countryId: country.id };
    }
};
exports.CityService = CityService;
exports.CityService = CityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __param(1, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CityService);
//# sourceMappingURL=city.service.js.map