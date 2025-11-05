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
const mongoose_1 = require("@nestjs/mongoose");
const country_schema_1 = require("./country.schema");
const mongoose_2 = require("mongoose");
let CountryService = class CountryService {
    constructor(countryModel) {
        this.countryModel = countryModel;
    }
    async getAllCountries(options) {
        const { limit = 20, page = 1, search = '', sortBy = 'name', sortOrder = 'asc', } = options;
        const skip = (page - 1) * limit;
        const query = { isActive: true };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        const sort = {
            [sortBy]: sortOrder === 'asc' ? 1 : -1,
        };
        const [data, total] = await Promise.all([
            this.countryModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
            this.countryModel.countDocuments(query).exec(),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            total,
            totalPages,
            currentPage: page,
        };
    }
    async getCountryById(id) {
        const country = await this.countryModel.findById(id).exec();
        if (!country) {
            throw new common_1.NotFoundException('Country not found');
        }
        return country;
    }
};
exports.CountryService = CountryService;
exports.CountryService = CountryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(country_schema_1.Country.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CountryService);
//# sourceMappingURL=country.service.js.map