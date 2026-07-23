import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyBranch } from './entities/company-branch.entity';
import {
  CompanyPermissionKey,
  CompanyPermissions,
  FULL_COMPANY_PERMISSIONS,
  getDefaultCompanyPermissions,
  normalizeCompanyPermissions,
} from './company-permissions';
import { buildUserHandle } from 'src/profiles/profile-format.util';

const COMPANY_MUTABLE_FIELDS = [
  'company_name',
  'business_name',
  'company_logo',
  'website_url',
  'official_email',
  'official_phone',
  'industry_type',
  'company_description',
  'founded_year',
  'country',
  'state',
  'city',
  'postal_code',
  'address_line1',
  'address_line2',
  'google_maps_link',
  'business_registration_number',
  'tax_identification_number',
  'registration_authority',
  'business_license_document',
  'company_type',
  'representative_name',
  'representative_designation',
  'representative_email',
  'representative_phone',
  'id_proof_document',
  'linkedin_page_url',
  'facebook_page_url',
  'instagram_page_url',
  'twitter_page_url',
  'youtube_channel_url',
  'verified_email_domain',
  'number_of_employees',
  'annual_revenue_range',
  'client_list',
  'certifications',
] as const;

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(CompanyPage)
    private readonly pageRepo: Repository<CompanyPage>,

    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(CompanyBranch)
    private readonly branchRepo: Repository<CompanyBranch>,
  ) {}

  getDefaultPermissions(role: 'owner' | 'admin' | 'editor') {
    return getDefaultCompanyPermissions(role);
  }

  normalizePermissions(
    role: 'owner' | 'admin' | 'editor',
    permissions?: Partial<CompanyPermissions> | null,
  ) {
    return normalizeCompanyPermissions(role, permissions);
  }

  private memberForUser(page: CompanyPage, userId: number) {
    if (page.ownerId === userId) {
      return {
        id: page.members?.find((member) => member.userId === userId)?.id ?? null,
        userId,
        role: 'owner' as const,
        hasAccess: true,
        permissions: FULL_COMPANY_PERMISSIONS,
      };
    }

    return page.members?.find((member) => member.userId === userId) ?? null;
  }

  async getCompanyAccess(
    companyId: number,
    userId: number,
    permission?: CompanyPermissionKey,
  ) {
    const page = await this.pageRepo.findOne({
      where: { id: companyId },
      relations: ['members', 'members.user', 'branches'],
    });

    if (!page) throw new NotFoundException('Company not found');

    const member = this.memberForUser(page, userId);
    if (!member || member.hasAccess === false) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const permissions = this.normalizePermissions(
      member.role as any,
      member.permissions,
    );
    if (permission && !permissions[permission]) {
      throw new ForbiddenException('You do not have permission for this action');
    }

    return { page, member, permissions };
  }

  async assertCompanyCanPublish(companyId: number, userId: number) {
    const access = await this.getCompanyAccess(
      companyId,
      userId,
      'publishContent',
    );

    if (access.page.verificationStatus !== 'approved') {
      throw new ForbiddenException(
        `Company publishing is unavailable while verification is ${
          access.page.verificationStatus || 'pending'
        }`,
      );
    }

    return access;
  }

  private formatBranch(branch: CompanyBranch | null | undefined) {
    if (!branch) return null;

    return {
      id: branch.id,
      label: branch.label,
      address: branch.address,
      lat: branch.lat,
      lng: branch.lng,
      location:
        branch.lat === null || branch.lng === null
          ? null
          : {
              lat: Number(branch.lat),
              lng: Number(branch.lng),
            },
    };
  }

  private formatCompany(page: CompanyPage) {
    return {
      id: page.id,
      name: page.company_name,
      companyName: page.company_name,
      username: page.username,
      businessName: page.business_name,
      logoUrl: page.company_logo,
      description: page.company_description,
      website: page.website_url,
      email: page.official_email,
      phone: page.official_phone,
      industry: page.industry_type,
      country: page.country,
      state: page.state,
      city: page.city,
      address_line1: page.address_line1,
      address_line2: page.address_line2,
      socials: {
        linkedin: page.linkedin_page_url,
        facebook: page.facebook_page_url,
        instagram: page.instagram_page_url,
        twitter: page.twitter_page_url,
        youtube: page.youtube_channel_url,
      },
      branches: (page.branches || []).map((branch) => this.formatBranch(branch)),
      verificationStatus: page.verificationStatus || 'pending',
      verificationReason: page.verificationReason || null,
      verifiedAt: page.verifiedAt || null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private formatLegacyPublicCompany(page: CompanyPage) {
    return {
      id: page.id,
      company_name: page.company_name,
      business_name: page.business_name,
      username: page.username,
      company_logo: page.company_logo,
      website_url: page.website_url,
      industry_type: page.industry_type,
      company_description: page.company_description,
      founded_year: page.founded_year,
      country: page.country,
      state: page.state,
      city: page.city,
      company_type: page.company_type,
      linkedin_page_url: page.linkedin_page_url,
      facebook_page_url: page.facebook_page_url,
      instagram_page_url: page.instagram_page_url,
      twitter_page_url: page.twitter_page_url,
      youtube_channel_url: page.youtube_channel_url,
      number_of_employees: page.number_of_employees,
      certifications: page.certifications || [],
      verificationStatus: page.verificationStatus || 'pending',
      verified: page.verificationStatus === 'approved',
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private formatLegacyManagedCompany(page: CompanyPage) {
    return {
      ...this.formatLegacyPublicCompany(page),
      official_email: page.official_email,
      official_phone: page.official_phone,
      postal_code: page.postal_code,
      address_line1: page.address_line1,
      address_line2: page.address_line2,
      google_maps_link: page.google_maps_link,
      business_registration_number: page.business_registration_number,
      tax_identification_number: page.tax_identification_number,
      registration_authority: page.registration_authority,
      business_license_document: page.business_license_document,
      representative_name: page.representative_name,
      representative_designation: page.representative_designation,
      representative_email: page.representative_email,
      representative_phone: page.representative_phone,
      id_proof_document: page.id_proof_document,
      verified_email_domain: page.verified_email_domain,
      annual_revenue_range: page.annual_revenue_range,
      client_list: page.client_list || [],
      verificationReason: page.verificationReason || null,
      verifiedAt: page.verifiedAt || null,
    };
  }

  private formatMember(member: PageMember, page?: CompanyPage) {
    const role = member.role || 'editor';
    const permissions = this.normalizePermissions(role, member.permissions);
    const user = member.user;
    const name =
      user?.full_name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    return {
      id: member.id,
      companyId: member.pageId ?? page?.id,
      userId: member.userId,
      name: name || '',
      phone: user?.phone || '',
      avatarUrl: user?.profile_photo || null,
      roleType: role,
      roleLabel: role.charAt(0).toUpperCase() + role.slice(1),
      hasAccess: member.hasAccess !== false,
      permissions,
    };
  }

  async createPage(data: any, userId: number) {
    let username = data.username?.toLowerCase();

    if (username) {
      if (!/^[a-z0-9.-]+$/.test(username)) {
        throw new BadRequestException(
          'Username can only contain a-z, 0-9, dot(.) and dash(-)',
        );
      }

      const exists = await this.pageRepo.findOne({ where: { username } });
      if (exists) throw new BadRequestException('Username already taken');
    } else {
      // 🔥 Auto-generate username
      username = data.company_name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/-+/g, '-');

      let counter = 0;
      let unique = username;

      while (await this.pageRepo.findOne({ where: { username: unique } })) {
        counter++;
        unique = `${username}-${counter}`;
      }

      username = unique;
    }

    const page = this.pageRepo.create({
      ...this.mapCompanyPatch(data),
      username,
      ownerId: userId,
      verificationStatus: 'pending',
      members: [
        {
          userId,
          role: 'owner',
        },
      ],
    });

    await this.pageRepo.save(page);

    return {
      message: 'Page created successfully',
      data: page,
    };
  }

  async getPages(query: any, userId: number) {
    const { search } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const mine = query.mine === true || query.mine === 'true';

    const qb = this.pageRepo
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.members', 'member');

    if (search) {
      qb.andWhere(
        '(page.company_name LIKE :search OR page.username LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (mine) {
      qb.andWhere(
        '(page.ownerId = :userId OR (member.userId = :userId AND member.hasAccess = :hasAccess))',
        { userId, hasAccess: true },
      );
    } else {
      qb.andWhere('page.verificationStatus = :verificationStatus', {
        verificationStatus: 'approved',
      });
    }

    qb.orderBy('page.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((p) => {
        const member = p.members.find((m) => m.userId === userId);
        const formatted = mine
          ? this.formatLegacyManagedCompany(p)
          : this.formatLegacyPublicCompany(p);

        return {
          ...formatted,
          association: member
            ? member.role
            : p.ownerId === userId
              ? 'owner'
              : 'public',
        };
      }),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    };
  }

  // ────────────────────────────────────────────────
  // ADD MEMBER TO PAGE
  // ────────────────────────────────────────────────
  async addMember(
    pageId: number,
    targetUserId: number,
    role: 'admin' | 'editor',
    requesterId: number,
  ) {
    if (!['admin', 'editor'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    // requester permission
    const requester =
      page.ownerId === requesterId
        ? { role: 'owner' }
        : page.members.find((m) => m.userId === requesterId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException(
        'You are not allowed to add members to this page',
      );
    }

    // cannot add owner again
    if (targetUserId === page.ownerId) {
      throw new BadRequestException('User is already the owner');
    }

    // check user exists
    const user = await this.userRepo.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new BadRequestException('User not found');

    // check already member
    const exists = page.members.find((m) => m.userId === targetUserId);

    if (exists) {
      throw new BadRequestException('User is already a member');
    }

    const member = this.memberRepo.create({
      pageId,
      userId: targetUserId,
      role,
    });

    await this.memberRepo.save(member);

    return {
      message: 'Member added successfully',
      data: {
        pageId,
        userId: targetUserId,
        role,
      },
    };
  }

  async getPageById(id: number, viewerId: number) {
    const page = await this.pageRepo.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!page) {
      throw new BadRequestException('Company page not found');
    }

    const member = this.memberForUser(page, viewerId);
    if (member && member.hasAccess !== false) {
      return this.formatLegacyManagedCompany(page);
    }

    if (page.verificationStatus !== 'approved') {
      throw new NotFoundException('Company page not found');
    }

    return this.formatLegacyPublicCompany(page);
  }

  async updatePage(id: number, data: any, userId: number) {
    await this.getCompanyAccess(id, userId, 'manageTeam');
    await this.pageRepo.update(id, this.mapCompanyPatch(data));

    return {
      message: 'Page updated successfully',
      data: this.formatLegacyManagedCompany(
        await this.pageRepo.findOne({ where: { id } }),
      ),
    };
  }

  async deletePage(id: number, userId: number) {
    const page = await this.pageRepo.findOne({
      where: { id, ownerId: userId },
    });

    if (!page) {
      throw new BadRequestException(
        'Page not found or you are not authorized to delete it',
      );
    }

    await this.pageRepo.delete(id);

    return { message: 'Page deleted successfully' };
  }
  async removeMember(pageId: number, memberId: number, requesterId: number) {
    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    const requester = page.members.find((m) => m.userId === requesterId);
    const target = page.members.find((m) => m.userId === memberId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException('Not authorized');
    }

    if (!target) throw new BadRequestException('Member not found');

    if (target.role === 'owner') {
      throw new BadRequestException('Owner cannot be removed');
    }

    await this.pageRepo.manager.delete('page_members', {
      pageId,
      userId: memberId,
    });

    return { message: 'Member removed successfully' };
  }

  async changeMemberRole(
    pageId: number,
    targetUserId: number,
    newRole: 'admin' | 'editor',
    requesterId: number,
  ) {
    if (!['admin', 'editor'].includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }

    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    // requester role
    const requester =
      page.ownerId === requesterId
        ? { role: 'owner' }
        : page.members.find((m) => m.userId === requesterId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException(
        'You are not allowed to change member roles',
      );
    }

    // owner protection
    if (targetUserId === page.ownerId) {
      throw new BadRequestException('Owner role cannot be changed');
    }

    const target = page.members.find((m) => m.userId === targetUserId);

    if (!target) {
      throw new BadRequestException('Member not found');
    }

    // admin limitations
    if (requester.role === 'admin') {
      // admin cannot change another admin to owner (owner not allowed anyway)
      if (target.role === 'admin' && newRole === 'admin') {
        throw new BadRequestException('No role change required');
      }
    }

    target.role = newRole;
    await this.pageRepo.manager.save(target);

    return {
      message: 'Member role updated successfully',
      data: {
        pageId,
        userId: targetUserId,
        role: newRole,
      },
    };
  }

  async getEmployerAccounts(userId: number) {
    const pages = await this.pageRepo
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.members', 'member')
      .leftJoinAndSelect('page.branches', 'branch')
      .where('page.ownerId = :userId', { userId })
      .orWhere('member.userId = :userId', { userId })
      .orderBy('page.createdAt', 'DESC')
      .getMany();

    const individual = {
      id: 'individual',
      companyId: null,
      companyName: 'Personal / Individual',
      roleType: 'owner',
      branchId: null,
      branchLocation: null,
      logoUrl: null,
      postingMode: 'individual',
      permissions: { ...FULL_COMPANY_PERMISSIONS },
      verificationStatus: null,
      verificationReason: null,
      canPublish: true,
      canPostJobs: true,
      jobPostingDisabledReason: null,
    };

    const companyAccounts = pages.map((page) => {
      const member = this.memberForUser(page, userId);
      const role = member?.role || 'owner';
      const branch = page.branches?.[0] || null;
      const permissions = this.normalizePermissions(
        role as any,
        (member as PageMember | null)?.permissions,
      );
      const jobPostingDisabledReason =
        !member || member.hasAccess === false
          ? 'Company access is disabled'
          : page.verificationStatus !== 'approved'
            ? `Company verification is ${page.verificationStatus || 'pending'}`
            : !permissions.postJobs
              ? 'Post jobs permission is required'
              : null;

      return {
        id: `company:${page.id}`,
        companyId: page.id,
        companyName: page.company_name,
        roleType: role,
        branchId: branch?.id || null,
        branchLocation: branch
          ? {
              label: branch.label,
              address: branch.address,
              lat: branch.lat,
              lng: branch.lng,
            }
          : null,
        logoUrl: page.company_logo || null,
        postingMode: 'company',
        permissions,
        verificationStatus: page.verificationStatus || 'pending',
        verificationReason: page.verificationReason || null,
        canPublish:
          member?.hasAccess !== false &&
          page.verificationStatus === 'approved' &&
          permissions.publishContent,
        canPostJobs: !jobPostingDisabledReason,
        jobPostingDisabledReason,
      };
    });

    return { data: [individual, ...companyAccounts] };
  }

  async getEmployerCompanySelectOptions(userId: number) {
    const accounts = await this.getEmployerAccounts(userId);

    return {
      data: accounts.data.map((account) => ({
        id: account.companyId,
        label: account.companyName,
        logoUrl: account.logoUrl,
        postingMode: account.postingMode,
        permissions: account.permissions,
        verificationStatus: account.verificationStatus,
        verificationReason: account.verificationReason,
        canPublish: account.canPublish,
        canPostJobs: account.canPostJobs,
        jobPostingDisabledReason: account.jobPostingDisabledReason,
      })),
    };
  }

  async getEmployerCompany(companyId: number, userId: number) {
    const { page, member, permissions } = await this.getCompanyAccess(
      companyId,
      userId,
    );

    return {
      data: {
        ...this.formatCompany(page),
        myRole: member.role,
        myPermissions: permissions,
        canPublish:
          page.verificationStatus === 'approved' && permissions.publishContent,
        canPostJobs:
          page.verificationStatus === 'approved' && permissions.postJobs,
        jobPostingDisabledReason:
          page.verificationStatus !== 'approved'
            ? `Company verification is ${page.verificationStatus || 'pending'}`
            : permissions.postJobs
              ? null
              : 'Post jobs permission is required',
      },
    };
  }

  async updateEmployerCompany(companyId: number, userId: number, data: any) {
    await this.getCompanyAccess(companyId, userId, 'manageTeam');

    const patch = this.mapEmployerCompanyPatch(data);
    await this.pageRepo.update(companyId, patch);

    const page = await this.pageRepo.findOne({
      where: { id: companyId },
      relations: ['branches'],
    });

    return {
      message: 'Company updated successfully',
      data: this.formatCompany(page),
    };
  }

  async createBranch(companyId: number, userId: number, data: any) {
    await this.getCompanyAccess(companyId, userId, 'manageTeam');

    const branch = await this.branchRepo.save(
      this.branchRepo.create({
        companyId,
        label: data.label,
        address: data.address || data.location || null,
        lat: data.lat ?? data.location?.lat ?? null,
        lng: data.lng ?? data.location?.lng ?? null,
      }),
    );

    return {
      message: 'Branch created successfully',
      data: this.formatBranch(branch),
    };
  }

  async updateBranch(
    companyId: number,
    branchId: number,
    userId: number,
    data: any,
  ) {
    await this.getCompanyAccess(companyId, userId, 'manageTeam');

    const branch = await this.branchRepo.findOne({
      where: { id: branchId, companyId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    if (data.label !== undefined) branch.label = data.label;
    if (data.address !== undefined || data.location !== undefined) {
      branch.address = data.address ?? data.location ?? branch.address;
    }
    if (data.lat !== undefined || data.location?.lat !== undefined) {
      branch.lat = data.lat ?? data.location.lat;
    }
    if (data.lng !== undefined || data.location?.lng !== undefined) {
      branch.lng = data.lng ?? data.location.lng;
    }

    await this.branchRepo.save(branch);

    return {
      message: 'Branch updated successfully',
      data: this.formatBranch(branch),
    };
  }

  async deleteBranch(companyId: number, branchId: number, userId: number) {
    await this.getCompanyAccess(companyId, userId, 'manageTeam');

    const result = await this.branchRepo.delete({ id: branchId, companyId });
    if (!result.affected) throw new NotFoundException('Branch not found');

    return { message: 'Branch deleted successfully' };
  }

  async getCompanyTeam(companyId: number, userId: number) {
    const { page } = await this.getCompanyAccess(
      companyId,
      userId,
      'manageTeam',
    );

    return {
      data: (page.members || []).map((member) => this.formatMember(member, page)),
    };
  }

  async inviteOrGrantCompanyTeamMember(
    companyId: number,
    userId: number,
    data: any,
  ) {
    await this.getCompanyAccess(companyId, userId, 'manageTeam');

    let target: User | null = null;
    if (data.userId) {
      target = await this.userRepo.findOne({ where: { id: Number(data.userId) } });
    } else if (data.phone) {
      target = await this.userRepo.findOne({ where: { phone: data.phone } });
    }

    if (!target) throw new BadRequestException('User not found');

    const role = data.roleType || data.role || 'editor';
    if (!['admin', 'editor'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const page = await this.pageRepo.findOne({
      where: { id: companyId },
      relations: ['members'],
    });
    if (!page) throw new NotFoundException('Company not found');
    if (target.id === page.ownerId) throw new BadRequestException('User is owner');

    let member = page.members.find((item) => item.userId === target.id);
    if (member) {
      member.role = role;
      member.hasAccess = data.hasAccess !== false;
      member.permissions = this.normalizePermissions(role, data.permissions);
    } else {
      member = this.memberRepo.create({
        pageId: companyId,
        userId: target.id,
        role,
        hasAccess: data.hasAccess !== false,
        permissions: this.normalizePermissions(role, data.permissions),
      });
    }

    const saved = await this.memberRepo.save(member);
    saved.user = target;

    return {
      message: 'Team member access saved successfully',
      data: this.formatMember(saved, page),
    };
  }

  async updateCompanyTeamAccess(memberId: number, userId: number, hasAccess: boolean) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      relations: ['page', 'page.members', 'user'],
    });
    if (!member) throw new NotFoundException('Team member not found');

    await this.getCompanyAccess(member.pageId, userId, 'manageTeam');

    if (member.role === 'owner') {
      throw new BadRequestException('Owner access cannot be changed');
    }

    member.hasAccess = hasAccess;
    const saved = await this.memberRepo.save(member);

    return {
      message: 'Team member access updated successfully',
      data: this.formatMember(saved, member.page),
    };
  }

  async updateCompanyTeamPermissions(
    memberId: number,
    userId: number,
    permissions: Partial<CompanyPermissions>,
  ) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      relations: ['page', 'page.members', 'user'],
    });
    if (!member) throw new NotFoundException('Team member not found');

    await this.getCompanyAccess(member.pageId, userId, 'manageTeam');

    if (member.role === 'owner') {
      throw new BadRequestException('Owner permissions cannot be changed');
    }

    member.permissions = this.normalizePermissions(member.role, permissions);
    const saved = await this.memberRepo.save(member);

    return {
      message: 'Team member permissions updated successfully',
      data: this.formatMember(saved, member.page),
    };
  }

  async userHasCompanyPermission(
    companyId: number,
    userId: number,
    permission: CompanyPermissionKey,
  ) {
    await this.getCompanyAccess(companyId, userId, permission);
    return true;
  }

  async getReelPublisherOptions(userId: number) {
    return this.getPublisherOptions(userId, 'publishContent');
  }

  async getPublisherOptions(
    userId: number,
    capability: 'publishContent' = 'publishContent',
  ) {
    if (capability !== 'publishContent') {
      throw new BadRequestException('Unsupported publisher capability');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const pages = await this.pageRepo
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.members', 'member')
      .where('page.ownerId = :userId', { userId })
      .orWhere('member.userId = :userId', { userId })
      .orderBy('page.company_name', 'ASC')
      .getMany();

    const userName =
      user.full_name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      'Jadeed user';

    const companies = pages.map((page) => {
      const member = this.memberForUser(page, userId);
      const permissions = this.normalizePermissions(
        member?.role || 'editor',
        (member as PageMember | null)?.permissions,
      );
      let disabledReason: string | undefined;

      if (!member || member.hasAccess === false) {
        disabledReason = 'Company access is disabled';
      } else if (page.verificationStatus !== 'approved') {
        disabledReason = `Company verification is ${
          page.verificationStatus || 'pending'
        }`;
      } else if (!permissions.publishContent) {
        disabledReason = 'Publish content permission is required';
      }

      return {
        type: 'company' as const,
        id: String(page.id),
        name: page.company_name,
        handle: `@${page.username}`,
        avatarUri: page.company_logo || null,
        verified: page.verificationStatus === 'approved',
        canPublish: !disabledReason,
        ...(disabledReason ? { disabledReason } : {}),
      };
    });

    return {
      data: [
        {
          type: 'user' as const,
          id: String(user.id),
          name: userName,
          handle: buildUserHandle(user),
          avatarUri: user.profile_photo || null,
          verified: Boolean(user.isVerified),
          canPublish: true,
        },
        ...companies,
      ],
    };
  }

  async getManageablePublishingCompanyIds(
    userId: number,
    companyIds: number[],
  ) {
    const ids = Array.from(new Set(companyIds.filter(Boolean)));
    if (!ids.length) return [];

    const pages = await this.pageRepo.find({
      where: { id: In(ids) },
      relations: ['members'],
    });

    return pages.flatMap((page) => {
      if (page.verificationStatus !== 'approved') return [];
      const member = this.memberForUser(page, userId);
      if (!member || member.hasAccess === false) return [];
      const permissions = this.normalizePermissions(
        member.role,
        member.permissions,
      );
      return (member.role === 'owner' || member.role === 'admin') &&
        permissions.publishContent
        ? [page.id]
        : [];
    });
  }

  async updateCompanyVerification(
    companyId: number,
    adminId: number,
    status: CompanyPage['verificationStatus'],
    reason?: string,
  ) {
    const page = await this.pageRepo.findOne({ where: { id: companyId } });
    if (!page) throw new NotFoundException('Company not found');

    page.verificationStatus = status;
    page.verificationReason = reason?.trim() || null;
    page.verifiedAt = status === 'approved' ? new Date() : null;
    page.verifiedByAdminId = status === 'approved' ? adminId : null;
    const saved = await this.pageRepo.save(page);

    return {
      message: 'Company verification updated successfully',
      company: {
        id: saved.id,
        verificationStatus: saved.verificationStatus,
        verificationReason: saved.verificationReason || null,
        verifiedAt: saved.verifiedAt || null,
        verifiedByAdminId: saved.verifiedByAdminId || null,
      },
    };
  }

  private mapEmployerCompanyPatch(data: any) {
    const patch = this.mapCompanyPatch(data);

    if (data.name !== undefined) patch.company_name = data.name;
    if (data.logoUrl !== undefined) patch.company_logo = data.logoUrl;
    if (data.description !== undefined) patch.company_description = data.description;
    if (data.website !== undefined) patch.website_url = data.website;

    if (data.socials) {
      patch.linkedin_page_url = data.socials.linkedin ?? patch.linkedin_page_url;
      patch.facebook_page_url = data.socials.facebook ?? patch.facebook_page_url;
      patch.instagram_page_url = data.socials.instagram ?? patch.instagram_page_url;
      patch.twitter_page_url = data.socials.twitter ?? patch.twitter_page_url;
      patch.youtube_channel_url = data.socials.youtube ?? patch.youtube_channel_url;
    }

    return patch;
  }

  private mapCompanyPatch(data: any) {
    const patch: Record<string, any> = {};
    for (const field of COMPANY_MUTABLE_FIELDS) {
      if (data[field] !== undefined) patch[field] = data[field];
    }
    return patch;
  }

}
