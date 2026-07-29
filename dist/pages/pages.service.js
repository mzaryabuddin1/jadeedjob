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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_page_entity_1 = require("./entities/company-page.entity");
const page_member_entity_1 = require("./entities/page-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
const company_branch_entity_1 = require("./entities/company-branch.entity");
const company_permissions_1 = require("./company-permissions");
const profile_format_util_1 = require("../profiles/profile-format.util");
const company_access_request_entity_1 = require("./entities/company-access-request.entity");
const company_verification_review_entity_1 = require("./entities/company-verification-review.entity");
const object_storage_service_1 = require("../storage/object-storage.service");
const notifications_service_1 = require("../notifications/notifications.service");
const auth_service_1 = require("../auth/auth.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const moderation_service_1 = require("../moderation/moderation.service");
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
    'company_type',
    'representative_name',
    'representative_designation',
    'representative_email',
    'representative_phone',
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
];
let PagesService = class PagesService {
    constructor(pageRepo, memberRepo, userRepo, branchRepo, accessRequestRepo, verificationReviewRepo, storageService, notificationsService, authService, idempotencyService, moderationService) {
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.userRepo = userRepo;
        this.branchRepo = branchRepo;
        this.accessRequestRepo = accessRequestRepo;
        this.verificationReviewRepo = verificationReviewRepo;
        this.storageService = storageService;
        this.notificationsService = notificationsService;
        this.authService = authService;
        this.idempotencyService = idempotencyService;
        this.moderationService = moderationService;
    }
    getDefaultPermissions(role) {
        return (0, company_permissions_1.getDefaultCompanyPermissions)(role);
    }
    normalizePermissions(role, permissions) {
        return (0, company_permissions_1.normalizeCompanyPermissions)(role, permissions);
    }
    memberForUser(page, userId) {
        if (page.ownerId === userId) {
            return {
                id: page.members?.find((member) => member.userId === userId)?.id ?? null,
                userId,
                role: 'owner',
                hasAccess: true,
                permissions: company_permissions_1.FULL_COMPANY_PERMISSIONS,
            };
        }
        return page.members?.find((member) => member.userId === userId) ?? null;
    }
    async getCompanyAccess(companyId, userId, permission) {
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['members', 'members.user', 'branches'],
        });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        const member = this.memberForUser(page, userId);
        if (!member || member.hasAccess === false) {
            throw new common_1.ForbiddenException('You do not have access to this company');
        }
        const permissions = this.normalizePermissions(member.role, member.permissions);
        if (permission && !permissions[permission]) {
            throw new common_1.ForbiddenException('You do not have permission for this action');
        }
        return { page, member, permissions };
    }
    async assertCompanyCanPublish(companyId, userId) {
        const access = await this.getCompanyAccess(companyId, userId, 'publishContent');
        if (access.page.verificationStatus !== 'approved') {
            throw new common_1.ForbiddenException(`Company publishing is unavailable while verification is ${access.page.verificationStatus || 'pending'}`);
        }
        return access;
    }
    formatBranch(branch) {
        if (!branch)
            return null;
        return {
            id: branch.id,
            label: branch.label,
            address: branch.address,
            lat: branch.lat,
            lng: branch.lng,
            location: branch.lat === null || branch.lng === null
                ? null
                : {
                    lat: Number(branch.lat),
                    lng: Number(branch.lng),
                },
        };
    }
    formatCompany(page) {
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
    formatLegacyPublicCompany(page) {
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
    formatLegacyManagedCompany(page) {
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
    formatMember(member, page) {
        const role = member.role || 'editor';
        const permissions = this.normalizePermissions(role, member.permissions);
        const user = member.user;
        const name = user?.full_name ||
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
    async createPage(data, userId) {
        let username = data.username?.toLowerCase();
        if (username) {
            if (!/^[a-z0-9.-]+$/.test(username)) {
                throw new common_1.BadRequestException('Username can only contain a-z, 0-9, dot(.) and dash(-)');
            }
            const exists = await this.pageRepo.findOne({ where: { username } });
            if (exists)
                throw new common_1.BadRequestException('Username already taken');
        }
        else {
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
    async getPages(query, userId) {
        const { search } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const mine = query.mine === true || query.mine === 'true';
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.members', 'member');
        if (search) {
            qb.andWhere('(page.company_name LIKE :search OR page.username LIKE :search)', { search: `%${search}%` });
        }
        if (mine) {
            qb.andWhere('(page.ownerId = :userId OR (member.userId = :userId AND member.hasAccess = :hasAccess))', { userId, hasAccess: true });
        }
        else {
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
    async addMember(pageId, targetUserId, role, requesterId) {
        if (!['admin', 'editor'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.ownerId === requesterId
            ? { role: 'owner' }
            : page.members.find((m) => m.userId === requesterId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('You are not allowed to add members to this page');
        }
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('User is already the owner');
        }
        const user = await this.userRepo.findOne({
            where: { id: targetUserId },
        });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const exists = page.members.find((m) => m.userId === targetUserId);
        if (exists) {
            throw new common_1.BadRequestException('User is already a member');
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
    async getPageById(id, viewerId) {
        const page = await this.pageRepo.findOne({
            where: { id },
            relations: ['members'],
        });
        if (!page) {
            throw new common_1.BadRequestException('Company page not found');
        }
        const member = this.memberForUser(page, viewerId);
        if (member && member.hasAccess !== false) {
            return this.formatLegacyManagedCompany(page);
        }
        if (page.verificationStatus !== 'approved') {
            throw new common_1.NotFoundException('Company page not found');
        }
        return this.formatLegacyPublicCompany(page);
    }
    async updatePage(id, data, userId) {
        await this.getCompanyAccess(id, userId, 'manageTeam');
        await this.pageRepo.update(id, this.mapCompanyPatch(data));
        return {
            message: 'Page updated successfully',
            data: this.formatLegacyManagedCompany(await this.pageRepo.findOne({ where: { id } })),
        };
    }
    async deletePage(id, userId) {
        const page = await this.pageRepo.findOne({
            where: { id, ownerId: userId },
        });
        if (!page) {
            throw new common_1.BadRequestException('Page not found or you are not authorized to delete it');
        }
        await this.pageRepo.delete(id);
        return { message: 'Page deleted successfully' };
    }
    async removeMember(pageId, memberId, requesterId) {
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.members.find((m) => m.userId === requesterId);
        const target = page.members.find((m) => m.userId === memberId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('Not authorized');
        }
        if (!target)
            throw new common_1.BadRequestException('Member not found');
        if (target.role === 'owner') {
            throw new common_1.BadRequestException('Owner cannot be removed');
        }
        await this.pageRepo.manager.delete('page_members', {
            pageId,
            userId: memberId,
        });
        return { message: 'Member removed successfully' };
    }
    async changeMemberRole(pageId, targetUserId, newRole, requesterId) {
        if (!['admin', 'editor'].includes(newRole)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.ownerId === requesterId
            ? { role: 'owner' }
            : page.members.find((m) => m.userId === requesterId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('You are not allowed to change member roles');
        }
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('Owner role cannot be changed');
        }
        const target = page.members.find((m) => m.userId === targetUserId);
        if (!target) {
            throw new common_1.BadRequestException('Member not found');
        }
        if (requester.role === 'admin') {
            if (target.role === 'admin' && newRole === 'admin') {
                throw new common_1.BadRequestException('No role change required');
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
    async createEmployerCompany(userId, data, logoFile, verificationFile, idempotencyKey) {
        if (!verificationFile) {
            throw new common_1.BadRequestException('verificationDocument is required');
        }
        return this.idempotencyService.execute(userId, 'employer_company_create', idempotencyKey, {
            ...data,
            logo: logoFile
                ? {
                    name: logoFile.originalname,
                    size: logoFile.size,
                    type: logoFile.mimetype,
                }
                : null,
            verificationDocument: {
                name: verificationFile.originalname,
                size: verificationFile.size,
                type: verificationFile.mimetype,
            },
        }, async () => {
            const stored = [];
            try {
                const logo = logoFile
                    ? await this.storageService.store({
                        ownerUserId: userId,
                        purpose: 'company-logos',
                        file: logoFile,
                        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
                        maxBytes: 5 * 1024 * 1024,
                        visibility: 'private',
                    })
                    : null;
                if (logo)
                    stored.push(logo);
                const evidence = await this.storageService.store({
                    ownerUserId: userId,
                    purpose: 'company-verification',
                    file: verificationFile,
                    allowedTypes: [
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'application/pdf',
                    ],
                    maxBytes: 10 * 1024 * 1024,
                    visibility: 'private',
                });
                stored.push(evidence);
                const page = await this.pageRepo.manager.transaction(async (manager) => {
                    const username = await this.generateUsername(data.company_name, data.username, manager.getRepository(company_page_entity_1.CompanyPage));
                    const created = await manager.getRepository(company_page_entity_1.CompanyPage).save(manager.getRepository(company_page_entity_1.CompanyPage).create({
                        ...this.mapCompanyPatch(data),
                        username,
                        ownerId: userId,
                        logoAssetId: logo?.id || null,
                        verificationDocumentAssetId: evidence.id,
                        verificationProofType: data.verificationProofType,
                        verificationStatus: 'pending',
                        verificationReason: null,
                    }));
                    await manager.getRepository(page_member_entity_1.PageMember).save(manager.getRepository(page_member_entity_1.PageMember).create({
                        pageId: created.id,
                        userId,
                        role: 'owner',
                        hasAccess: true,
                        permissions: company_permissions_1.FULL_COMPANY_PERMISSIONS,
                    }));
                    await manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).save(manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).create({
                        companyId: created.id,
                        actorUserId: userId,
                        previousStatus: null,
                        nextStatus: 'pending',
                        reason: 'Initial verification submission',
                        submissionSnapshot: {
                            verificationDocumentAssetId: evidence.id,
                            verificationProofType: data.verificationProofType,
                        },
                    }));
                    return created;
                });
                return {
                    message: 'Company submitted for verification',
                    company: await this.formatCompanyWithAssets(page),
                };
            }
            catch (error) {
                await Promise.all(stored.map((asset) => this.storageService.remove(asset.id).catch(() => undefined)));
                throw error;
            }
        });
    }
    async searchEmployerCompanies(userId, query) {
        const currentPage = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(30, Math.max(1, Number(query.limit) || 20));
        const term = String(query.q || '').trim().toLowerCase();
        const escaped = term.replace(/[\\%_]/g, (value) => `\\${value}`);
        const blocked = await this.moderationService.blockedTargets(userId);
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .where('page.verificationStatus = :approved', { approved: 'approved' })
            .andWhere('(LOWER(page.company_name) LIKE :search OR LOWER(page.username) LIKE :search OR LOWER(page.industry_type) LIKE :search)', { search: `%${escaped}%` });
        if (blocked.companyIds.length) {
            qb.andWhere('page.id NOT IN (:...blockedCompanyIds)', {
                blockedCompanyIds: blocked.companyIds,
            });
        }
        qb.orderBy('CASE WHEN LOWER(page.company_name) = :exact OR LOWER(page.username) = :exact THEN 0 WHEN LOWER(page.company_name) LIKE :prefix OR LOWER(page.username) LIKE :prefix THEN 1 ELSE 2 END', 'ASC')
            .addOrderBy('page.company_name', 'ASC')
            .addOrderBy('page.id', 'ASC')
            .setParameters({ exact: term, prefix: `${escaped}%` })
            .skip((currentPage - 1) * limit)
            .take(limit);
        const [pages, total] = await qb.getManyAndCount();
        return {
            data: await Promise.all(pages.map(async (page) => ({
                id: page.id,
                companyName: page.company_name,
                username: page.username,
                industry: page.industry_type || null,
                location: [page.city, page.state, page.country]
                    .filter(Boolean)
                    .join(', ') || null,
                logoUrl: await this.companyLogoUrl(page),
                verified: true,
            }))),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage,
        };
    }
    async requestCompanyAccess(companyId, userId, data) {
        return this.idempotencyService.execute(userId, 'company_access_request', data.clientRequestId, { companyId, ...data }, async () => {
            const company = await this.pageRepo.findOne({
                where: { id: companyId, verificationStatus: 'approved' },
                relations: ['members'],
            });
            if (!company)
                throw new common_1.NotFoundException('Company not found');
            await this.moderationService.assertInteractionAllowed(userId, 'company', companyId);
            if (company.ownerId === userId ||
                company.members.some((member) => member.userId === userId && member.hasAccess !== false)) {
                throw new common_1.BadRequestException('You already have company access');
            }
            const existing = await this.accessRequestRepo.findOne({
                where: { companyId, userId, status: 'pending' },
            });
            if (existing) {
                throw new common_1.BadRequestException('A pending access request already exists');
            }
            const request = await this.accessRequestRepo.save(this.accessRequestRepo.create({
                companyId,
                userId,
                message: String(data.message || '').trim() || null,
                requestedRole: data.requestedRole || 'editor',
                clientRequestId: String(data.clientRequestId || '').trim() || null,
            }));
            await this.notificationsService.create({
                userId: company.ownerId,
                type: 'company_access_request',
                title: 'Company access requested',
                message: 'A user requested access to your company.',
                data: { companyId, companyAccessRequestId: request.id },
            });
            return {
                request: this.formatAccessRequest(request),
            };
        });
    }
    async getCompanyAccessRequests(companyId, userId, query) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        const currentPage = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const [requests, total] = await this.accessRequestRepo.findAndCount({
            where: !query.status || query.status === 'all'
                ? { companyId }
                : { companyId, status: query.status },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            skip: (currentPage - 1) * limit,
            take: limit,
        });
        return {
            data: requests.map((request) => this.formatAccessRequest(request)),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage,
        };
    }
    async reviewCompanyAccessRequest(requestId, reviewerId, data) {
        const result = await this.accessRequestRepo.manager.transaction(async (manager) => {
            const request = await manager
                .getRepository(company_access_request_entity_1.CompanyAccessRequest)
                .findOne({
                where: { id: requestId },
                relations: ['company', 'user'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!request)
                throw new common_1.NotFoundException('Access request not found');
            await this.getCompanyAccess(request.companyId, reviewerId, 'manageTeam');
            if (request.status !== 'pending') {
                throw new common_1.BadRequestException('Access request is no longer pending');
            }
            request.status = data.action === 'approve' ? 'approved' : 'rejected';
            request.reviewReason = String(data.reason || '').trim() || null;
            request.reviewedByUserId = reviewerId;
            request.reviewedAt = new Date();
            if (data.action === 'approve') {
                const role = data.role || request.requestedRole || 'editor';
                let member = await manager.getRepository(page_member_entity_1.PageMember).findOne({
                    where: { pageId: request.companyId, userId: request.userId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!member) {
                    member = manager.getRepository(page_member_entity_1.PageMember).create({
                        pageId: request.companyId,
                        userId: request.userId,
                    });
                }
                member.role = role;
                member.hasAccess = true;
                member.permissions = this.normalizePermissions(role, data.permissions);
                await manager.save(member);
            }
            return manager.save(request);
        });
        await this.notificationsService.create({
            userId: result.userId,
            type: 'company_access_status',
            title: 'Company access updated',
            message: `Your company access request was ${result.status}.`,
            data: {
                companyId: result.companyId,
                companyAccessRequestId: result.id,
            },
        });
        return {
            message: `Access request ${result.status}`,
            request: this.formatAccessRequest(result),
        };
    }
    async resubmitCompanyVerification(companyId, userId, data, verificationFile) {
        if (!verificationFile) {
            throw new common_1.BadRequestException('verificationDocument is required');
        }
        const { page } = await this.getCompanyAccess(companyId, userId, 'manageTeam');
        if (page.verificationStatus === 'suspended') {
            throw new common_1.ForbiddenException('Suspended companies cannot resubmit verification');
        }
        const asset = await this.storageService.store({
            ownerUserId: userId,
            purpose: 'company-verification',
            file: verificationFile,
            allowedTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
            ],
            maxBytes: 10 * 1024 * 1024,
            visibility: 'private',
            metadata: { companyId },
        });
        const previousAssetId = page.verificationDocumentAssetId;
        try {
            await this.pageRepo.manager.transaction(async (manager) => {
                await manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).save(manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).create({
                    companyId,
                    actorUserId: userId,
                    previousStatus: page.verificationStatus,
                    nextStatus: 'pending',
                    reason: String(data.message || '').trim() || 'Verification resubmitted',
                    submissionSnapshot: {
                        verificationDocumentAssetId: asset.id,
                        verificationProofType: data.verificationProofType,
                    },
                }));
                page.verificationStatus = 'pending';
                page.verificationReason = null;
                page.verifiedAt = null;
                page.verifiedByAdminId = null;
                page.verificationDocumentAssetId = asset.id;
                page.verificationProofType = data.verificationProofType;
                await manager.save(page);
            });
        }
        catch (error) {
            await this.storageService.remove(asset);
            throw error;
        }
        if (previousAssetId) {
            await this.storageService.remove(previousAssetId).catch(() => undefined);
        }
        return {
            message: 'Company verification resubmitted successfully',
            company: await this.formatCompanyWithAssets(page),
        };
    }
    async transferCompanyOwnership(companyId, ownerId, newOwnerUserId, currentPassword) {
        if (ownerId === newOwnerUserId) {
            throw new common_1.BadRequestException('The selected user is already the owner');
        }
        await this.authService.validateUserByIdAndPassword(ownerId, currentPassword);
        const page = await this.pageRepo.manager.transaction(async (manager) => {
            const company = await manager.getRepository(company_page_entity_1.CompanyPage).findOne({
                where: { id: companyId },
                relations: ['members'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!company)
                throw new common_1.NotFoundException('Company not found');
            if (company.ownerId !== ownerId) {
                throw new common_1.ForbiddenException('Only the company owner can transfer ownership');
            }
            const nextOwner = await manager.getRepository(user_entity_1.User).findOne({
                where: { id: newOwnerUserId, isBanned: false },
            });
            if (!nextOwner || nextOwner.deletedAt || nextOwner.deletionScheduledAt) {
                throw new common_1.BadRequestException('The new owner is not eligible');
            }
            let oldMember = company.members.find((member) => member.userId === ownerId);
            if (!oldMember) {
                oldMember = manager.getRepository(page_member_entity_1.PageMember).create({
                    pageId: companyId,
                    userId: ownerId,
                });
            }
            oldMember.role = 'admin';
            oldMember.hasAccess = true;
            oldMember.permissions = this.normalizePermissions('admin');
            let nextMember = company.members.find((member) => member.userId === newOwnerUserId);
            if (!nextMember) {
                nextMember = manager.getRepository(page_member_entity_1.PageMember).create({
                    pageId: companyId,
                    userId: newOwnerUserId,
                });
            }
            nextMember.role = 'owner';
            nextMember.hasAccess = true;
            nextMember.permissions = company_permissions_1.FULL_COMPANY_PERMISSIONS;
            company.ownerId = newOwnerUserId;
            await manager.save([oldMember, nextMember]);
            return manager.save(company);
        });
        await Promise.all([
            this.notificationsService.create({
                userId: newOwnerUserId,
                type: 'company_ownership',
                title: 'Company ownership transferred',
                message: `You are now the owner of ${page.company_name}.`,
                data: { companyId },
            }),
            this.notificationsService.create({
                userId: ownerId,
                type: 'company_ownership',
                title: 'Company ownership transferred',
                message: `${page.company_name} ownership was transferred successfully.`,
                data: { companyId },
            }),
        ]);
        return {
            message: 'Company ownership transferred successfully',
            companyId,
            previousOwnerUserId: ownerId,
            ownerUserId: newOwnerUserId,
        };
    }
    async getAdminCompanyReviews(query) {
        const currentPage = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.owner', 'owner');
        if (query.status && query.status !== 'all') {
            qb.andWhere('page.verificationStatus = :status', {
                status: query.status,
            });
        }
        if (query.q) {
            qb.andWhere('(page.company_name LIKE :search OR page.username LIKE :search OR page.business_registration_number LIKE :search)', { search: `%${String(query.q).trim().replace(/[\\%_]/g, '\\$&')}%` });
        }
        qb.orderBy('page.updatedAt', 'DESC')
            .addOrderBy('page.id', 'DESC')
            .skip((currentPage - 1) * limit)
            .take(limit);
        const [pages, total] = await qb.getManyAndCount();
        return {
            data: await Promise.all(pages.map((page) => this.formatAdminCompany(page, false))),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage,
        };
    }
    async getAdminCompanyReview(companyId) {
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['owner', 'members', 'members.user', 'branches'],
        });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        const history = await this.verificationReviewRepo.find({
            where: { companyId },
            order: { createdAt: 'DESC' },
        });
        return {
            company: await this.formatAdminCompany(page, true),
            verificationHistory: history,
        };
    }
    async getEmployerAccounts(userId) {
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
            permissions: { ...company_permissions_1.FULL_COMPANY_PERMISSIONS },
            verificationStatus: null,
            verificationReason: null,
            canPublish: true,
            canPostJobs: true,
            jobPostingDisabledReason: null,
        };
        const companyAccounts = await Promise.all(pages.map(async (page) => {
            const member = this.memberForUser(page, userId);
            const role = member?.role || 'owner';
            const branch = page.branches?.[0] || null;
            const permissions = this.normalizePermissions(role, member?.permissions);
            const jobPostingDisabledReason = !member || member.hasAccess === false
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
                logoUrl: await this.companyLogoUrl(page),
                postingMode: 'company',
                permissions,
                verificationStatus: page.verificationStatus || 'pending',
                verificationReason: page.verificationReason || null,
                canPublish: member?.hasAccess !== false &&
                    page.verificationStatus === 'approved' &&
                    permissions.publishContent,
                canPostJobs: !jobPostingDisabledReason,
                jobPostingDisabledReason,
            };
        }));
        return { data: [individual, ...companyAccounts] };
    }
    async getEmployerCompanySelectOptions(userId) {
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
    async getEmployerCompany(companyId, userId) {
        const { page, member, permissions } = await this.getCompanyAccess(companyId, userId);
        return {
            data: {
                ...(await this.formatCompanyWithAssets(page)),
                myRole: member.role,
                myPermissions: permissions,
                canPublish: page.verificationStatus === 'approved' && permissions.publishContent,
                canPostJobs: page.verificationStatus === 'approved' && permissions.postJobs,
                jobPostingDisabledReason: page.verificationStatus !== 'approved'
                    ? `Company verification is ${page.verificationStatus || 'pending'}`
                    : permissions.postJobs
                        ? null
                        : 'Post jobs permission is required',
            },
        };
    }
    async updateEmployerCompany(companyId, userId, data) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        const patch = this.mapEmployerCompanyPatch(data);
        await this.pageRepo.update(companyId, patch);
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['branches'],
        });
        return {
            message: 'Company updated successfully',
            data: await this.formatCompanyWithAssets(page),
        };
    }
    async createBranch(companyId, userId, data) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        const branch = await this.branchRepo.save(this.branchRepo.create({
            companyId,
            label: data.label,
            address: data.address || data.location || null,
            lat: data.lat ?? data.location?.lat ?? null,
            lng: data.lng ?? data.location?.lng ?? null,
        }));
        return {
            message: 'Branch created successfully',
            data: this.formatBranch(branch),
        };
    }
    async updateBranch(companyId, branchId, userId, data) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        const branch = await this.branchRepo.findOne({
            where: { id: branchId, companyId },
        });
        if (!branch)
            throw new common_1.NotFoundException('Branch not found');
        if (data.label !== undefined)
            branch.label = data.label;
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
    async deleteBranch(companyId, branchId, userId) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        const result = await this.branchRepo.delete({ id: branchId, companyId });
        if (!result.affected)
            throw new common_1.NotFoundException('Branch not found');
        return { message: 'Branch deleted successfully' };
    }
    async getCompanyTeam(companyId, userId) {
        const { page } = await this.getCompanyAccess(companyId, userId, 'manageTeam');
        return {
            data: (page.members || []).map((member) => this.formatMember(member, page)),
        };
    }
    async inviteOrGrantCompanyTeamMember(companyId, userId, data) {
        await this.getCompanyAccess(companyId, userId, 'manageTeam');
        let target = null;
        if (data.userId) {
            target = await this.userRepo.findOne({ where: { id: Number(data.userId) } });
        }
        else if (data.phone) {
            target = await this.userRepo.findOne({ where: { phone: data.phone } });
        }
        if (!target)
            throw new common_1.BadRequestException('User not found');
        const role = data.roleType || data.role || 'editor';
        if (!['admin', 'editor'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        if (target.id === page.ownerId)
            throw new common_1.BadRequestException('User is owner');
        let member = page.members.find((item) => item.userId === target.id);
        if (member) {
            member.role = role;
            member.hasAccess = data.hasAccess !== false;
            member.permissions = this.normalizePermissions(role, data.permissions);
        }
        else {
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
    async updateCompanyTeamAccess(memberId, userId, hasAccess) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId },
            relations: ['page', 'page.members', 'user'],
        });
        if (!member)
            throw new common_1.NotFoundException('Team member not found');
        await this.getCompanyAccess(member.pageId, userId, 'manageTeam');
        if (member.role === 'owner') {
            throw new common_1.BadRequestException('Owner access cannot be changed');
        }
        member.hasAccess = hasAccess;
        const saved = await this.memberRepo.save(member);
        return {
            message: 'Team member access updated successfully',
            data: this.formatMember(saved, member.page),
        };
    }
    async updateCompanyTeamPermissions(memberId, userId, permissions) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId },
            relations: ['page', 'page.members', 'user'],
        });
        if (!member)
            throw new common_1.NotFoundException('Team member not found');
        await this.getCompanyAccess(member.pageId, userId, 'manageTeam');
        if (member.role === 'owner') {
            throw new common_1.BadRequestException('Owner permissions cannot be changed');
        }
        member.permissions = this.normalizePermissions(member.role, permissions);
        const saved = await this.memberRepo.save(member);
        return {
            message: 'Team member permissions updated successfully',
            data: this.formatMember(saved, member.page),
        };
    }
    async userHasCompanyPermission(companyId, userId, permission) {
        await this.getCompanyAccess(companyId, userId, permission);
        return true;
    }
    async getReelPublisherOptions(userId) {
        return this.getPublisherOptions(userId, 'publishContent');
    }
    async getPublisherOptions(userId, capability = 'publishContent') {
        if (capability !== 'publishContent') {
            throw new common_1.BadRequestException('Unsupported publisher capability');
        }
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const pages = await this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.members', 'member')
            .where('page.ownerId = :userId', { userId })
            .orWhere('member.userId = :userId', { userId })
            .orderBy('page.company_name', 'ASC')
            .getMany();
        const userName = user.full_name ||
            [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
            'Jadeed user';
        const companies = pages.map((page) => {
            const member = this.memberForUser(page, userId);
            const permissions = this.normalizePermissions(member?.role || 'editor', member?.permissions);
            let disabledReason;
            if (!member || member.hasAccess === false) {
                disabledReason = 'Company access is disabled';
            }
            else if (page.verificationStatus !== 'approved') {
                disabledReason = `Company verification is ${page.verificationStatus || 'pending'}`;
            }
            else if (!permissions.publishContent) {
                disabledReason = 'Publish content permission is required';
            }
            return {
                type: 'company',
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
                    type: 'user',
                    id: String(user.id),
                    name: userName,
                    handle: (0, profile_format_util_1.buildUserHandle)(user),
                    avatarUri: user.profile_photo || null,
                    verified: Boolean(user.isVerified),
                    canPublish: true,
                },
                ...companies,
            ],
        };
    }
    async getManageablePublishingCompanyIds(userId, companyIds) {
        const ids = Array.from(new Set(companyIds.filter(Boolean)));
        if (!ids.length)
            return [];
        const pages = await this.pageRepo.find({
            where: { id: (0, typeorm_2.In)(ids) },
            relations: ['members'],
        });
        return pages.flatMap((page) => {
            if (page.verificationStatus !== 'approved')
                return [];
            const member = this.memberForUser(page, userId);
            if (!member || member.hasAccess === false)
                return [];
            const permissions = this.normalizePermissions(member.role, member.permissions);
            return (member.role === 'owner' || member.role === 'admin') &&
                permissions.publishContent
                ? [page.id]
                : [];
        });
    }
    async updateCompanyVerification(companyId, adminId, status, reason) {
        const page = await this.pageRepo.findOne({ where: { id: companyId } });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        const previousStatus = page.verificationStatus;
        const saved = await this.pageRepo.manager.transaction(async (manager) => {
            page.verificationStatus = status;
            page.verificationReason = reason?.trim() || null;
            page.verifiedAt = status === 'approved' ? new Date() : null;
            page.verifiedByAdminId = status === 'approved' ? adminId : null;
            const updated = await manager.save(page);
            await manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).save(manager.getRepository(company_verification_review_entity_1.CompanyVerificationReview).create({
                companyId,
                actorUserId: adminId,
                previousStatus,
                nextStatus: status,
                reason: reason?.trim() || null,
                submissionSnapshot: {
                    verificationDocumentAssetId: page.verificationDocumentAssetId || null,
                    verificationProofType: page.verificationProofType || null,
                },
            }));
            return updated;
        });
        await this.notificationsService.create({
            userId: page.ownerId,
            type: 'company_verification',
            title: 'Company verification updated',
            message: `Company verification is now ${status}.`,
            data: { companyId },
        });
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
    async generateUsername(companyName, requested, repository = this.pageRepo) {
        const base = String(requested || companyName || 'company')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[.-]+|[.-]+$/g, '')
            .slice(0, 90) || 'company';
        if (requested && !/^[a-z0-9.-]+$/.test(base)) {
            throw new common_1.BadRequestException('Invalid company username');
        }
        for (let counter = 0; counter < 1000; counter += 1) {
            const candidate = counter ? `${base}-${counter}` : base;
            if (!(await repository.findOne({ where: { username: candidate } }))) {
                return candidate;
            }
        }
        throw new common_1.BadRequestException('Unable to generate a company username');
    }
    async companyLogoUrl(page) {
        if (page.logoAssetId) {
            return this.storageService.getUrl(page.logoAssetId);
        }
        return page.company_logo || null;
    }
    async formatCompanyWithAssets(page) {
        return {
            ...this.formatCompany(page),
            logoUrl: await this.companyLogoUrl(page),
        };
    }
    formatAccessRequest(request) {
        const user = request.user;
        return {
            id: request.id,
            companyId: request.companyId,
            userId: request.userId,
            user: user
                ? {
                    id: user.id,
                    name: user.full_name ||
                        [user.firstName, user.lastName].filter(Boolean).join(' '),
                    avatarUrl: user.profile_photo || null,
                }
                : undefined,
            requestedRole: request.requestedRole,
            message: request.message || '',
            status: request.status,
            reviewReason: request.reviewReason || null,
            reviewedAt: request.reviewedAt || null,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        };
    }
    async formatAdminCompany(page, detailed) {
        const base = {
            id: page.id,
            companyName: page.company_name,
            username: page.username,
            industry: page.industry_type || null,
            location: [page.city, page.state, page.country].filter(Boolean).join(', ') ||
                null,
            logoUrl: await this.companyLogoUrl(page),
            verificationStatus: page.verificationStatus,
            verificationReason: page.verificationReason || null,
            verificationProofType: page.verificationProofType || null,
            verificationDocumentUrl: page.verificationDocumentAssetId
                ? await this.storageService.getUrl(page.verificationDocumentAssetId)
                : null,
            owner: page.owner
                ? {
                    id: page.owner.id,
                    name: page.owner.full_name ||
                        [page.owner.firstName, page.owner.lastName]
                            .filter(Boolean)
                            .join(' '),
                    phone: page.owner.phone,
                }
                : null,
            verifiedAt: page.verifiedAt || null,
            verifiedByAdminId: page.verifiedByAdminId || null,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
        };
        if (!detailed)
            return base;
        return {
            ...base,
            businessName: page.business_name,
            description: page.company_description,
            officialEmail: page.official_email,
            officialPhone: page.official_phone,
            website: page.website_url,
            address: {
                line1: page.address_line1,
                line2: page.address_line2,
                city: page.city,
                state: page.state,
                country: page.country,
                postalCode: page.postal_code,
            },
            registration: {
                number: page.business_registration_number,
                taxId: page.tax_identification_number,
                authority: page.registration_authority,
            },
            representative: {
                name: page.representative_name,
                designation: page.representative_designation,
                email: page.representative_email,
                phone: page.representative_phone,
            },
            team: (page.members || []).map((member) => this.formatMember(member, page)),
            branches: (page.branches || []).map((branch) => this.formatBranch(branch)),
        };
    }
    mapEmployerCompanyPatch(data) {
        const patch = this.mapCompanyPatch(data);
        if (data.name !== undefined)
            patch.company_name = data.name;
        if (data.logoUrl !== undefined)
            patch.company_logo = data.logoUrl;
        if (data.description !== undefined)
            patch.company_description = data.description;
        if (data.website !== undefined)
            patch.website_url = data.website;
        if (data.socials) {
            patch.linkedin_page_url = data.socials.linkedin ?? patch.linkedin_page_url;
            patch.facebook_page_url = data.socials.facebook ?? patch.facebook_page_url;
            patch.instagram_page_url = data.socials.instagram ?? patch.instagram_page_url;
            patch.twitter_page_url = data.socials.twitter ?? patch.twitter_page_url;
            patch.youtube_channel_url = data.socials.youtube ?? patch.youtube_channel_url;
        }
        return patch;
    }
    mapCompanyPatch(data) {
        const patch = {};
        for (const field of COMPANY_MUTABLE_FIELDS) {
            if (data[field] !== undefined)
                patch[field] = data[field];
        }
        return patch;
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(1, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(company_branch_entity_1.CompanyBranch)),
    __param(4, (0, typeorm_1.InjectRepository)(company_access_request_entity_1.CompanyAccessRequest)),
    __param(5, (0, typeorm_1.InjectRepository)(company_verification_review_entity_1.CompanyVerificationReview)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        object_storage_service_1.ObjectStorageService,
        notifications_service_1.NotificationsService,
        auth_service_1.AuthService,
        idempotency_service_1.IdempotencyService,
        moderation_service_1.ModerationService])
], PagesService);
//# sourceMappingURL=pages.service.js.map