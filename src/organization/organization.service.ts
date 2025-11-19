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
    members?: { user: number; role: 'admin' | 'user' }[];
  }) {
    // Check duplicate
    const exists = await this.orgRepo.findOne({ where: { name: data.name } });
    if (exists) throw new BadRequestException('Organization name already exists');

    // Validate user ids
    const memberMap = new Map<number, string>();

    data.members?.forEach((m) => memberMap.set(m.user, m.role));

    const allUserIds = [...memberMap.keys(), data.createdBy];
    const uniqueIds = Array.from(new Set(allUserIds));

    const validUsers = await this.usersService.findUsersByIds(uniqueIds);
    if (validUsers.length !== uniqueIds.length)
      throw new BadRequestException('One or more user IDs are invalid');

    // Prepare members list
    const membersToCreate = [
      { userId: data.createdBy, role: 'owner' },
      ...Array.from(memberMap.entries()).map(([userId, role]) => ({
        userId,
        role,
      })),
    ];

    // Create organization + members
    const org = this.orgRepo.create({
      name: data.name,
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
}
