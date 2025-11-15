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
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
let OrganizationService = class OrganizationService {
    constructor(prisma, usersService) {
        this.prisma = prisma;
        this.usersService = usersService;
    }
    async createOrg(data) {
        const exists = await this.prisma.organization.findFirst({
            where: { name: data.name },
        });
        if (exists) {
            throw new common_1.BadRequestException('Organization name already exists');
        }
        const memberMap = new Map();
        if (data.members) {
            for (const m of data.members) {
                memberMap.set(m.user, m.role || 'user');
            }
        }
        const allUserIds = [...memberMap.keys(), data.createdBy];
        const uniqueUserIds = Array.from(new Set(allUserIds));
        const validUsers = await this.prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: { id: true },
        });
        if (validUsers.length !== uniqueUserIds.length) {
            throw new common_1.BadRequestException('One or more user IDs are invalid');
        }
        const membersToCreate = [
            { userId: data.createdBy, role: 'owner' },
            ...Array.from(memberMap.entries()).map(([userId, role]) => ({
                userId,
                role,
            })),
        ];
        const org = await this.prisma.organization.create({
            data: {
                name: data.name,
                industry: data.industry,
                createdBy: data.createdBy,
                isActive: 'active',
                members: {
                    create: membersToCreate,
                },
            },
            include: {
                members: {
                    include: { user: true },
                },
            },
        });
        return org;
    }
    async getMyOrganizations(userId) {
        return this.prisma.organization.findMany({
            where: {
                OR: [
                    { createdBy: userId },
                    {
                        members: {
                            some: { userId },
                        },
                    },
                ],
            },
            include: {
                members: {
                    include: { user: true },
                },
            },
        });
    }
    async addMember(orgId, member, requesterId) {
        const org = await this.prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                members: true,
            },
        });
        if (!org) {
            throw new common_1.BadRequestException('Organization not found');
        }
        const isAllowed = org.createdBy === requesterId ||
            org.members.some((m) => m.userId === requesterId &&
                (m.role === 'owner' || m.role === 'admin'));
        if (!isAllowed) {
            throw new common_1.BadRequestException('Only owners or admins can add members to the organization');
        }
        const user = await this.usersService.getUserById(member.userId);
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const alreadyMember = org.members.some((m) => m.userId === member.userId);
        if (alreadyMember) {
            throw new common_1.BadRequestException('User is already a member');
        }
        await this.prisma.orgMember.create({
            data: {
                organizationId: orgId,
                userId: member.userId,
                role: member.role,
            },
        });
        const updatedOrg = await this.prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                members: { include: { user: true } },
            },
        });
        return {
            message: 'Member added successfully',
            organization: updatedOrg,
        };
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map