import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(OrgMember)
    private readonly orgMemberRepo: Repository<OrgMember>,

    private readonly usersService: UsersService,
  ) {}

  // ────────────────────────────────────────────────
  async createOrg(data: {
    name: string;
    industry: string;
    createdBy: number;
    username?: string;
    members?: { user: number; role: 'admin' | 'user' }[];
  }) {
    // Validate user ids
    const memberMap = new Map<number, string>();
    data.members?.forEach((m) => memberMap.set(m.user, m.role));

    const allUserIds = [...memberMap.keys(), data.createdBy];
    const uniqueIds = Array.from(new Set(allUserIds));

    const validUsers = await this.usersService.findUsersByIds(uniqueIds);
    if (validUsers.length !== uniqueIds.length)
      throw new BadRequestException('One or more user IDs are invalid');

    // Username logic
    let username: string;
    if (data.username) {
      const exists = await this.orgRepo.findOne({
        where: { username: data.username },
      });
      if (exists) throw new BadRequestException('Username already taken');
      username = data.username.toLowerCase();
    } else {
      username = await this.generateUniqueUsername(data.name);
    }

    const membersToCreate = [
      { userId: data.createdBy, role: 'owner' },
      ...Array.from(memberMap.entries()).map(([userId, role]) => ({
        userId,
        role,
      })),
    ];

    const org = this.orgRepo.create({
      name: data.name,
      username,
      industry: data.industry,
      createdBy: data.createdBy,
      members: membersToCreate.map((m) =>
        this.orgMemberRepo.create({
          userId: m.userId,
          role: m.role as any,
        }),
      ),
    });

    return this.orgRepo.save(org);
  }


  // ────────────────────────────────────────────────
  async getMyOrganizations(userId: number) {
    return this.orgRepo.find({
      where: [
        { createdBy: userId },
        { members: { userId } },
      ],
      relations: ['members', 'members.user'],
    });
  }

  // ────────────────────────────────────────────────
  async addMember(
    orgId: number,
    member: { userId: number; role: 'admin' | 'user' },
    requesterId: number,
  ) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members'],
    });

    if (!org) throw new BadRequestException('Organization not found');

    // permissions
    const isAllowed =
      org.createdBy === requesterId ||
      org.members.some(
        (m) => m.userId === requesterId && (m.role === 'owner' || m.role === 'admin'),
      );

    if (!isAllowed) {
      throw new BadRequestException('Only owners or admins can add members');
    }

    // user exists?
    const user = await this.usersService.getUserById(member.userId);
    if (!user) throw new BadRequestException('User not found');

    // already member?
    if (org.members.some((m) => m.userId === member.userId)) {
      throw new BadRequestException('User is already a member');
    }

    // add member
    await this.orgMemberRepo.save(
      this.orgMemberRepo.create({
        organizationId: orgId,
        userId: member.userId,
        role: member.role,
      }),
    );

    return this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members', 'members.user'],
    });
  }

  async removeMember(
  orgId: number,
  targetUserId: number,
  requesterId: number,
  ) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members'],
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    // Permission check
    const requesterMember = org.members.find(
      (m) => m.userId === requesterId,
    );

    const isAllowed =
      org.createdBy === requesterId ||
      requesterMember?.role === 'admin';

    if (!isAllowed) {
      throw new BadRequestException(
        'Only owner or admin can remove members',
      );
    }

    // Find target member
    const targetMember = org.members.find(
      (m) => m.userId === targetUserId,
    );

    if (!targetMember) {
      throw new BadRequestException('User is not a member of this organization');
    }

    // Prevent removing owner
    if (targetMember.role === 'owner') {
      throw new BadRequestException('Owner cannot be removed');
    }

    // Remove member
    await this.orgMemberRepo.delete({
      organizationId: orgId,
      userId: targetUserId,
    });

    return {
      message: 'Member removed successfully',
    };
  }

    private async generateUniqueUsername(base: string): Promise<string> {
    const slug = base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let username = slug;
    let counter = 1;

    while (
      await this.orgRepo.findOne({ where: { username } })
    ) {
      username = `${slug}-${counter}`;
      counter++;
    }

    return username;
  }
async getOrganizations(options: {
  userId: number;
  mine?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}) {
  const {
    userId,
    mine = false,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  const qb = this.orgRepo
    .createQueryBuilder('org')
    .leftJoinAndSelect('org.members', 'member')
    .leftJoinAndSelect('member.user', 'memberUser')
    .leftJoinAndSelect('org.creator', 'creator');

  // 🔍 Search by name OR username
  if (search) {
    qb.andWhere(
      '(org.name LIKE :search OR org.username LIKE :search)',
      { search: `%${search}%` },
    );
  }

  // 👤 Only my organizations (optional filter)
  if (mine) {
    qb.andWhere(
      '(org.createdBy = :userId OR member.userId = :userId)',
      { userId },
    );
  }

  // 📊 Sorting
  qb.orderBy(`org.${sortBy}`, sortOrder);

  // 📄 Pagination
  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();

  // ✅ ADD mine FLAG
  const enrichedData = data.map((org) => ({
    ...org,
    mine:
      org.createdBy === userId ||
      org.members?.some((m) => m.userId === userId),
  }));

  return {
    data: enrichedData,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}


}
