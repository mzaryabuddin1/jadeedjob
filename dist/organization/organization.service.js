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
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const organization_entity_1 = require("./entities/organization.entity");
const org_member_entity_1 = require("./entities/org-member.entity");
const users_service_1 = require("../users/users.service");
let OrganizationService = class OrganizationService {
    constructor(orgRepo, orgMemberRepo, usersService) {
        this.orgRepo = orgRepo;
        this.orgMemberRepo = orgMemberRepo;
        this.usersService = usersService;
    }
    async createOrg(data) {
        const exists = await this.orgRepo.findOne({ where: { name: data.name } });
        if (exists)
            throw new common_1.BadRequestException('Organization name already exists');
        const memberMap = new Map();
        data.members?.forEach((m) => memberMap.set(m.user, m.role));
        const allUserIds = [...memberMap.keys(), data.createdBy];
        const uniqueIds = Array.from(new Set(allUserIds));
        const validUsers = await this.usersService.findUsersByIds(uniqueIds);
        if (validUsers.length !== uniqueIds.length)
            throw new common_1.BadRequestException('One or more user IDs are invalid');
        const membersToCreate = [
            { userId: data.createdBy, role: 'owner' },
            ...Array.from(memberMap.entries()).map(([userId, role]) => ({
                userId,
                role,
            })),
        ];
        const org = this.orgRepo.create({
            name: data.name,
            industry: data.industry,
            createdBy: data.createdBy,
            members: membersToCreate.map((m) => this.orgMemberRepo.create({
                userId: m.userId,
                role: m.role,
            })),
        });
        return this.orgRepo.save(org);
    }
    async getMyOrganizations(userId) {
        return this.orgRepo.find({
            where: [
                { createdBy: userId },
                { members: { userId } },
            ],
            relations: ['members', 'members.user'],
        });
    }
    async addMember(orgId, member, requesterId) {
        const org = await this.orgRepo.findOne({
            where: { id: orgId },
            relations: ['members'],
        });
        if (!org)
            throw new common_1.BadRequestException('Organization not found');
        const isAllowed = org.createdBy === requesterId ||
            org.members.some((m) => m.userId === requesterId && (m.role === 'owner' || m.role === 'admin'));
        if (!isAllowed) {
            throw new common_1.BadRequestException('Only owners or admins can add members');
        }
        const user = await this.usersService.getUserById(member.userId);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (org.members.some((m) => m.userId === member.userId)) {
            throw new common_1.BadRequestException('User is already a member');
        }
        await this.orgMemberRepo.save(this.orgMemberRepo.create({
            organizationId: orgId,
            userId: member.userId,
            role: member.role,
        }));
        return this.orgRepo.findOne({
            where: { id: orgId },
            relations: ['members', 'members.user'],
        });
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(organization_entity_1.Organization)),
    __param(1, (0, typeorm_1.InjectRepository)(org_member_entity_1.OrgMember)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map