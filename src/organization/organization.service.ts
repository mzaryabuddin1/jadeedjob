// src/organization/organization.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createOrg(data: {
    name: string;
    industry: string;
    createdBy: number;
    members?: { user: number; role: 'admin' | 'user' }[];
  }) {
    // Check for duplicate organization name
    const exists = await this.prisma.organization.findFirst({
      where: { name: data.name },
    });

    if (exists) {
      throw new BadRequestException('Organization name already exists');
    }

    // Normalize members into a map
    const memberMap = new Map<number, 'admin' | 'user'>();
    if (data.members) {
      for (const m of data.members) {
        memberMap.set(m.user, m.role || 'user');
      }
    }

    // all user IDs = members + creator
    const allUserIds = [...memberMap.keys(), data.createdBy];
    const uniqueUserIds = Array.from(new Set(allUserIds));

    // Check all users exist
    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true },
    });

    if (validUsers.length !== uniqueUserIds.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    // Build members list (owner + provided members)
    const membersToCreate = [
      { userId: data.createdBy, role: 'owner' as const },
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

  async getMyOrganizations(userId: number) {
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

  async addMember(
    orgId: number,
    member: { userId: number; role: 'admin' | 'user' },
    requesterId: number,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: true,
      },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    // Check if requester is owner or admin
    const isAllowed =
      org.createdBy === requesterId ||
      org.members.some(
        (m) =>
          m.userId === requesterId &&
          (m.role === 'owner' || m.role === 'admin'),
      );

    if (!isAllowed) {
      throw new BadRequestException(
        'Only owners or admins can add members to the organization',
      );
    }

    // Ensure target user exists
    const user = await this.usersService.getUserById(member.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already member
    const alreadyMember = org.members.some(
      (m) => m.userId === member.userId,
    );

    if (alreadyMember) {
      throw new BadRequestException('User is already a member');
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
}
