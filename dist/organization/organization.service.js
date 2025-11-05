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
const mongoose_1 = require("@nestjs/mongoose");
const organization_schema_1 = require("./organization.schema");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
let OrganizationService = class OrganizationService {
    constructor(orgModel, usersService) {
        this.orgModel = orgModel;
        this.usersService = usersService;
    }
    async createOrg(data) {
        const exists = await this.orgModel.findOne({ name: data.name });
        if (exists) {
            throw new common_1.BadRequestException('Organization name already exists');
        }
        const memberSet = new Map();
        if (data.members) {
            for (const m of data.members) {
                memberSet.set(String(m.user), m.role || 'user');
            }
        }
        const allUserIds = [...memberSet.keys(), String(data.createdBy)];
        const validUsers = await this.usersService.findUsersByIds([...new Set(allUserIds)].map((id) => new mongoose_2.Types.ObjectId(id)));
        if (validUsers.length !== new Set(allUserIds).size) {
            throw new common_1.BadRequestException('One or more user IDs are invalid');
        }
        const members = [
            { user: data.createdBy, role: 'owner' },
            ...Array.from(memberSet.entries()).map(([userId, role]) => ({
                user: new mongoose_2.Types.ObjectId(userId),
                role,
            })),
        ];
        return this.orgModel.create({
            name: data.name,
            industry: data.industry,
            createdBy: data.createdBy,
            members,
        });
    }
    async getMyOrganizations(userId) {
        return this.orgModel.find({
            $or: [
                { createdBy: userId },
                { 'members.user': new mongoose_2.Types.ObjectId(userId) },
            ],
        }).populate("members.user");
    }
    async addMember(orgId, member, requesterId) {
        const org = await this.orgModel.findById(orgId);
        if (!org) {
            throw new common_1.BadRequestException('Organization not found');
        }
        const isAllowed = org.members?.some((m) => m.user.toString() === requesterId &&
            (m.role === 'owner' || m.role === 'admin'));
        if (!isAllowed) {
            throw new common_1.BadRequestException('Only owners or admins can add members to the organization');
        }
        const user = await this.usersService.getUserById(member.user);
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const alreadyMember = org.members.some((m) => m.user.toString() === member.user);
        if (alreadyMember) {
            throw new common_1.BadRequestException('User is already a member');
        }
        org.members.push({
            user: new mongoose_2.Types.ObjectId(member.user),
            role: member.role,
        });
        await org.save();
        return {
            message: 'Member added successfully',
            organization: org,
        };
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(organization_schema_1.Organization.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map