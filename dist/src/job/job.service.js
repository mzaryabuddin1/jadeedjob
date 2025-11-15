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
exports.JobService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let JobService = class JobService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJob(data) {
        const { location, ...rest } = data;
        return this.prisma.job.create({
            data: {
                ...rest,
                location: `POINT(${location.lng} ${location.lat})`,
            },
        });
    }
    async findNearbyJobs(query) {
        const { lat, lng, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', radiusKm = 1, } = query;
        const skip = (page - 1) * limit;
        const jobs = await this.prisma.$queryRawUnsafe(`
      SELECT *,
        ST_Distance(
          location,
          ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)
        ) AS distance
      FROM "Job"
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      )
      AND "isActive" = true
      ${search ? `AND description ILIKE '%${search}%'` : ''}
      ORDER BY "${sortBy}" ${sortOrder}
      LIMIT ${limit}
      OFFSET ${skip}
    `);
        const totalResult = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) FROM "Job"
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      )
      AND "isActive" = true
      ${search ? `AND description ILIKE '%${search}%'` : ''}
    `);
        const total = Number(totalResult[0].count);
        return {
            data: jobs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async findJobs(query) {
        const { filter, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', lat, lng, } = query;
        const skip = (page - 1) * limit;
        if (lat && lng) {
            return this.findNearbyJobs({
                lat,
                lng,
                filter,
                page,
                limit,
                search,
                sortBy,
                sortOrder,
            });
        }
        const where = { isActive: true };
        if (filter)
            where.filterId = Number(filter);
        if (search)
            where.description = { contains: search, mode: 'insensitive' };
        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.job.count({ where }),
        ]);
        return {
            data: jobs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
};
exports.JobService = JobService;
exports.JobService = JobService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobService);
//# sourceMappingURL=job.service.js.map