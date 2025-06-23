import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Organization } from './organization.schema';
import { Model, Types } from 'mongoose';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<Organization>,
    private readonly usersService: UsersService,
  ) {}

  async createOrg(data: {
    name: string;
    industry: string;
    createdBy: Types.ObjectId;
    members?: { user: Types.ObjectId; role: 'admin' | 'user' }[];
  }) {
    const exists = await this.orgModel.findOne({ name: data.name });
    if (exists) {
      throw new BadRequestException('Organization name already exists');
    }

    const memberSet = new Map<string, 'admin' | 'user'>();
    if (data.members) {
      for (const m of data.members) {
        memberSet.set(String(m.user), m.role || 'user');
      }
    }

    const allUserIds = [...memberSet.keys(), String(data.createdBy)];
    const validUsers = await this.usersService.findUsersByIds(
      [...new Set(allUserIds)].map((id) => new Types.ObjectId(id)),
    );
    if (validUsers.length !== new Set(allUserIds).size) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    const members = [
      { user: data.createdBy, role: 'owner' },
      ...Array.from(memberSet.entries()).map(([userId, role]) => ({
        user: new Types.ObjectId(userId),
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

  async getMyOrganizations(userId: string) {
    return this.orgModel.find({
      $or: [
        { createdBy: userId },
        { 'members.user': new Types.ObjectId(userId) },
      ],
    }).populate("members.user");
  }

  async addMember(
    orgId: string,
    member: { user: string; role: 'admin' | 'user' },
    requesterId: string,
  ) {
    const org = await this.orgModel.findById(orgId);

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const isAllowed = org.members?.some(
      (m: any) =>
        m.user.toString() === requesterId &&
        (m.role === 'owner' || m.role === 'admin'),
    );

    if (!isAllowed) {
      throw new BadRequestException(
        'Only owners or admins can add members to the organization',
      );
    }

    const user = await this.usersService.getUserById(member.user);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const alreadyMember = org.members.some(
      (m: any) => m.user.toString() === member.user,
    );

    if (alreadyMember) {
      throw new BadRequestException('User is already a member');
    }

    org.members.push({
      user: new Types.ObjectId(member.user),
      role: member.role,
    });

    await org.save();

    return {
      message: 'Member added successfully',
      organization: org,
    };
  }
}
