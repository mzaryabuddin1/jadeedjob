import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { CompanyBranch } from 'src/pages/entities/company-branch.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  CompanyPermissionKey,
  normalizeCompanyPermissions,
} from 'src/pages/company-permissions';
import { ModerationService } from 'src/moderation/moderation.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';

type JobStatus = 'draft' | 'active' | 'closed';

const JOB_SORT_COLUMNS: Record<string, string> = {
  createdAt: 'job.createdAt',
  updatedAt: 'job.updatedAt',
  salaryAmount: 'job.salaryAmount',
  title: 'job.title',
  status: 'job.status',
};

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(CompanyPage)
    private pageRepo: Repository<CompanyPage>,

    @InjectRepository(CompanyBranch)
    private branchRepo: Repository<CompanyBranch>,

    @InjectRepository(PageMember)
    private memberRepo: Repository<PageMember>,

    @InjectRepository(JobApplication)
    private jobApplicationRepo: Repository<JobApplication>,

    private firebaseService: FirebaseService,

    private notificationsService: NotificationsService,
    private moderationService: ModerationService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  private async assertCompanyPermission(
    pageId: number | null | undefined,
    userId: number,
    permission: CompanyPermissionKey,
    requireApproval = false,
  ) {
    if (!pageId) return;

    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });
    if (!page) throw new BadRequestException('Company not found');

    if (requireApproval && page.verificationStatus !== 'approved') {
      throw new ForbiddenException(
        `Company job posting is unavailable while verification is ${
          page.verificationStatus || 'pending'
        }`,
      );
    }

    if (page.ownerId === userId) return;

    const member = page.members?.find((item) => item.userId === userId);
    if (!member || member.hasAccess === false) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const permissions = normalizeCompanyPermissions(
      member.role,
      member.permissions,
    );
    if (!permissions[permission]) {
      throw new ForbiddenException('You do not have permission for this action');
    }
  }

  private async normalizeCompanyAndBranch(data: any, userId: number) {
    let pageId = this.optionalPositiveId(data.companyId ?? data.pageId);
    let branchId = this.optionalPositiveId(data.branchId);

    if (
      data.postingMode === 'individual' ||
      data.companyId === null ||
      data.pageId === null
    ) {
      pageId = null;
      branchId = null;
    }

    if (branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: branchId } });
      if (!branch) throw new BadRequestException('Branch not found');
      if (pageId && branch.companyId !== pageId) {
        throw new BadRequestException('Branch does not belong to company');
      }
      pageId = branch.companyId;
    }

    if (data.postingMode === 'company' && !pageId) {
      throw new BadRequestException('companyId is required for company posting');
    }

    await this.assertCompanyPermission(pageId, userId, 'postJobs', true);

    return { pageId: pageId ?? null, branchId: branchId ?? null };
  }

  private async assertJobUpdateAccess(
    job: Pick<Job, 'createdBy' | 'pageId'>,
    nextPageId: number | null,
    userId: number,
  ) {
    const currentPageId = job.pageId ?? null;

    if (currentPageId === nextPageId) {
      if (nextPageId) {
        await this.assertCompanyPermission(
          nextPageId,
          userId,
          'editJobs',
          true,
        );
      } else if (job.createdBy !== userId) {
        throw new ForbiddenException('You are not allowed to update this job');
      }
      return;
    }

    if (currentPageId) {
      await this.assertCompanyPermission(
        currentPageId,
        userId,
        'editJobs',
      );
    } else if (job.createdBy !== userId) {
      throw new ForbiddenException('You are not allowed to update this job');
    }

    if (nextPageId) {
      await this.assertCompanyPermission(
        nextPageId,
        userId,
        'postJobs',
        true,
      );
    } else if (job.createdBy !== userId) {
      throw new ForbiddenException(
        'Only the job creator can move it to an individual account',
      );
    }
  }

  private optionalPositiveId(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid ID value');
    }
    return id;
  }

  private parseJobStatuses(value: unknown): JobStatus[] {
    if (value === undefined || value === null || value === '') return [];

    const values = Array.isArray(value) ? value : String(value).split(',');
    const statuses = [
      ...new Set(
        values
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (statuses.some((item) => !['draft', 'active', 'closed'].includes(item))) {
      throw new BadRequestException('Invalid job status filter');
    }

    return statuses as JobStatus[];
  }

  private normalizeJobPayload(data: any, pageId: number | null, branchId: number | null) {
    const status = (data.status || 'active') as JobStatus;
    if (!['draft', 'active', 'closed'].includes(status)) {
      throw new BadRequestException('Invalid job status');
    }

    const payload = { ...data };
    delete payload.companyId;
    delete payload.location;

    if (payload.jobType && !payload.jobTypes) payload.jobTypes = [payload.jobType];
    if (payload.shift && !payload.shifts) payload.shifts = [payload.shift];
    if (payload.deadline && !payload.endDate) payload.endDate = payload.deadline;

    payload.pageId = pageId;
    payload.branchId = branchId;
    payload.postingMode = pageId ? 'company' : 'individual';
    payload.status = status;
    payload.isActive = status === 'active';
    payload.isRemote = Boolean(payload.isRemote);

    return payload;
  }

  private buildLocationUpdate(data: any, status: JobStatus) {
    if (data.isRemote === true) return null;
    if (!data.location && status === 'draft') return null;
    if (!data.location) return undefined;

    if (
      typeof data.location?.lat !== 'number' ||
      typeof data.location?.lng !== 'number'
    ) {
      throw new BadRequestException('Valid location is required');
    }

    return () =>
      `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;
  }

  async createJob(data: any, userId: number, idempotencyKey?: string) {
    return this.idempotencyService.execute(
      userId,
      'job:create',
      idempotencyKey,
      data,
      () => this.createJobInternal(data, userId),
    );
  }

  private async createJobInternal(data: any, userId: number) {
    const { pageId, branchId } = await this.normalizeCompanyAndBranch(data, userId);
    const payload = this.normalizeJobPayload(data, pageId, branchId);
    const status = payload.status as JobStatus;
    const location = this.buildLocationUpdate(data, status);

    if (location === undefined && payload.isRemote !== true && status !== 'draft') {
      throw new BadRequestException('Valid location is required');
    }

    const insertResult = await this.jobRepo.insert({
      ...payload,
      createdBy: userId,
      location,
    });

    const insertedId = insertResult.identifiers?.[0]?.id;
    if (!insertedId) throw new BadRequestException('Failed to create job');

    const savedJob = await this.findJobEntityForResponse(insertedId);
    if (!savedJob) throw new BadRequestException('Failed to load created job');

    if (savedJob.filterId && savedJob.status === 'active') {
      await this.firebaseService.sendToFilterTopic(
        savedJob.filterId,
        'New Job Posted',
        savedJob.title ?? 'A new job matches your preferences!',
        {
          jobId: savedJob.id.toString(),
          filterId: savedJob.filterId.toString(),
        },
      );

      await this.notificationsService.createForFilterSubscribers(
        savedJob.filterId,
        'New Job Posted',
        savedJob.title ?? 'A new job matches your preferences!',
        {
          jobId: String(savedJob.id),
          filterId: String(savedJob.filterId),
          companyId: savedJob.pageId ? String(savedJob.pageId) : null,
        },
        userId,
      );
    }

    return this.formatJob(savedJob);
  }

  async findNearbyJobs(query: any, userId?: number) {
    const {
      lat,
      lng,
      page = 1,
      limit = 10,
      search = '',
      sortBy,
      sortOrder = 'DESC',
    } = query;

    const currentPage = Number(page);
    const take = Math.min(100, Math.max(1, Number(limit) || 10));
    const latitude = Number(lat);
    const longitude = Number(lng);
    const offset = (currentPage - 1) * take;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(currentPage) ||
      currentPage < 1
    ) {
      throw new BadRequestException('Invalid nearby job query parameters');
    }

    const allowedSortColumns: Record<string, string> = {
      createdAt: 'j.createdAt',
      updatedAt: 'j.updatedAt',
      salaryAmount: 'j.salaryAmount',
      title: 'j.title',
      distance: 'distance',
    };
    const hasExplicitSortBy = sortBy !== undefined && sortBy !== '';
    const requestedSortBy = hasExplicitSortBy ? String(sortBy) : 'distance';
    const orderBy = allowedSortColumns[requestedSortBy] ?? 'distance';
    const orderDirection = hasExplicitSortBy
      ? String(sortOrder).toUpperCase() === 'ASC'
        ? 'ASC'
        : 'DESC'
      : 'ASC';
    const pointText = `POINT(${longitude} ${latitude})`;
    const searchClause = search
      ? 'AND (j.title LIKE ? OR j.description LIKE ? OR p.company_name LIKE ?)'
      : '';
    const searchParams = search
      ? [`%${search}%`, `%${search}%`, `%${search}%`]
      : [];
    const blocked = userId
      ? await this.moderationService.blockedTargets(userId)
      : { userIds: [], companyIds: [] };
    const blockedUserClause = blocked.userIds.length
      ? 'AND (j.pageId IS NOT NULL OR j.createdBy NOT IN (?))'
      : '';
    const blockedCompanyClause = blocked.companyIds.length
      ? 'AND (j.pageId IS NULL OR j.pageId NOT IN (?))'
      : '';
    const visibilityParams = [
      ...(blocked.userIds.length ? [blocked.userIds] : []),
      ...(blocked.companyIds.length ? [blocked.companyIds] : []),
    ];

    const jobs = await this.jobRepo.query(
      `
        SELECT
          j.*,
          CASE WHEN j.location IS NULL THEN NULL ELSE ST_X(j.location) END AS lng,
          CASE WHEN j.location IS NULL THEN NULL ELSE ST_Y(j.location) END AS lat,
          p.id AS page_id,
          p.company_name,
          p.username AS page_username,
          p.company_logo,
          b.id AS branch_id,
          b.label AS branch_label,
          b.address AS branch_address,
          b.lat AS branch_lat,
          b.lng AS branch_lng,
          u.firstName AS creator_firstName,
          u.lastName AS creator_lastName,
          u.full_name AS creator_full_name,
          u.profile_photo AS creator_profile_photo,
          (SELECT COUNT(*) FROM job_applications ja WHERE ja.jobId = j.id) AS applicationsCount,
          CASE
            WHEN j.location IS NULL THEN NULL
            ELSE ST_Distance_Sphere(j.location, ST_GeomFromText(?, 4326))
          END AS distance
        FROM jobs j
        LEFT JOIN pages p ON p.id = j.pageId
        LEFT JOIN company_branches b ON b.id = j.branchId
        LEFT JOIN users u ON u.id = j.createdBy
        WHERE j.isActive = 1 AND COALESCE(j.status, 'active') = 'active'
          AND COALESCE(j.moderationStatus, 'visible') = 'visible'
          AND u.isBanned = 0 AND u.deletedAt IS NULL
          AND (j.pageId IS NULL OR p.verificationStatus = 'approved')
          ${blockedUserClause}
          ${blockedCompanyClause}
          ${searchClause}
        ORDER BY j.location IS NULL ASC, ${orderBy} ${orderDirection}
        LIMIT ?
        OFFSET ?
      `,
      [pointText, ...visibilityParams, ...searchParams, take, offset],
    );

    const countResult = await this.jobRepo.query(
      `
        SELECT COUNT(*) AS total
        FROM jobs j
        LEFT JOIN pages p ON p.id = j.pageId
        LEFT JOIN users u ON u.id = j.createdBy
        WHERE j.isActive = 1 AND COALESCE(j.status, 'active') = 'active'
          AND COALESCE(j.moderationStatus, 'visible') = 'visible'
          AND u.isBanned = 0 AND u.deletedAt IS NULL
          AND (j.pageId IS NULL OR p.verificationStatus = 'approved')
          ${blockedUserClause}
          ${blockedCompanyClause}
          ${searchClause}
      `,
      [...visibilityParams, ...searchParams],
    );

    const total = Number(countResult[0]?.total || 0);

    return {
      data: jobs.map((job) => this.formatRawJob(job)),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async findJobs(query: any, userId?: number) {
    const {
      filter,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      lat,
      lng,
      myjobs = false,
      status,
      statuses,
      companyId,
    } = query;

    const requestedCompanyId = this.optionalPositiveId(companyId);

    const requestedStatuses = this.parseJobStatuses(statuses);
    const requestedStatus = status ? String(status).trim().toLowerCase() : '';

    if (requestedStatus && !['draft', 'active', 'closed'].includes(requestedStatus)) {
      throw new BadRequestException('Invalid job status filter');
    }

    if (requestedStatus && requestedStatuses.length > 0) {
      throw new BadRequestException('Use status or statuses, not both');
    }

    if (
      lat !== undefined &&
      lng !== undefined &&
      lat !== '' &&
      lng !== '' &&
      myjobs !== 'true' &&
      !requestedCompanyId
    ) {
      return this.findNearbyJobs(query, userId);
    }

    if (requestedCompanyId && myjobs === 'true') {
      throw new BadRequestException(
        'companyId cannot be combined with myjobs',
      );
    }

    if (requestedCompanyId) {
      const company = await this.pageRepo.findOne({
        where: {id: requestedCompanyId},
      });
      if (!company || company.verificationStatus !== 'approved') {
        throw new NotFoundException('Company profile not found');
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 10));
    const orderColumn = JOB_SORT_COLUMNS[sortBy] || JOB_SORT_COLUMNS.createdAt;
    const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.page', 'page')
      .leftJoinAndSelect('job.branch', 'branch')
      .leftJoinAndSelect('job.creator', 'creator')
      .leftJoin('page.members', 'member')
      .loadRelationCountAndMap('job.applicationsCount', 'job.applications');

    qb.andWhere("COALESCE(job.moderationStatus, 'visible') = 'visible'");

    if (myjobs === 'true') {
      if (!userId) throw new BadRequestException('User not authenticated');
      qb.andWhere(
        new Brackets((inner) => {
          inner
            .where('job.createdBy = :userId', { userId })
            .orWhere('page.ownerId = :userId', { userId })
            .orWhere('member.userId = :userId', { userId });
        }),
      );
    } else {
      qb.andWhere('job.isActive = :active', { active: true });
      qb.andWhere("COALESCE(job.status, 'active') = 'active'");
      qb.andWhere('creator.isBanned = :creatorBanned', {
        creatorBanned: false,
      });
      qb.andWhere('creator.deletedAt IS NULL');
      qb.andWhere(
        '(job.pageId IS NULL OR page.verificationStatus = :approvedCompany)',
        { approvedCompany: 'approved' },
      );
      if (userId) {
        const blocked = await this.moderationService.blockedTargets(userId);
        if (blocked.userIds.length) {
          qb.andWhere(
            '(job.pageId IS NOT NULL OR job.createdBy NOT IN (:...blockedUserIds))',
            { blockedUserIds: blocked.userIds },
          );
        }
        if (blocked.companyIds.length) {
          qb.andWhere(
            '(job.pageId IS NULL OR job.pageId NOT IN (:...blockedCompanyIds))',
            { blockedCompanyIds: blocked.companyIds },
          );
        }
      }
    }

    if (filter) qb.andWhere('job.filterId = :filterId', { filterId: Number(filter) });
    if (requestedCompanyId) {
      qb.andWhere('job.pageId = :companyId', {
        companyId: requestedCompanyId,
      });
    }
    if (requestedStatuses.length > 0) {
      qb.andWhere(
        "COALESCE(job.status, 'active') IN (:...jobStatuses)",
        { jobStatuses: requestedStatuses },
      );
    } else if (requestedStatus) {
      qb.andWhere(
        "COALESCE(job.status, 'active') = :status",
        { status: requestedStatus },
      );
    }
    if (search) {
      qb.andWhere(
        new Brackets((inner) => {
          inner
            .where('job.title LIKE :search', { search: `%${search}%` })
            .orWhere('job.description LIKE :search', { search: `%${search}%` })
            .orWhere('page.company_name LIKE :search', { search: `%${search}%` })
            .orWhere('page.username LIKE :search', { search: `%${search}%` })
            .orWhere('creator.full_name LIKE :search', { search: `%${search}%` })
            .orWhere('creator.firstName LIKE :search', { search: `%${search}%` })
            .orWhere('creator.lastName LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    qb.orderBy(orderColumn, orderDirection)
      .skip((currentPage - 1) * take)
      .take(take);

    const [jobs, total] = await qb.getManyAndCount();

    const baseResponse = {
      data: jobs.map((job) => this.formatJob(job)),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };

    if (myjobs !== 'true') return baseResponse;

    const statusCountsQuery = this.jobRepo
      .createQueryBuilder('countJob')
      .leftJoin('countJob.page', 'countPage')
      .leftJoin('countPage.members', 'countMember')
      .leftJoin('countJob.creator', 'countCreator')
      .select("COALESCE(countJob.status, 'active')", 'status')
      .addSelect('COUNT(DISTINCT countJob.id)', 'count')
      .where(
        "COALESCE(countJob.status, 'active') IN (:...countStatuses)",
        {countStatuses: ['active', 'closed']},
      )
      .andWhere("COALESCE(countJob.moderationStatus, 'visible') = 'visible'");

    statusCountsQuery.andWhere(
      new Brackets((inner) => {
        inner
          .where('countJob.createdBy = :countUserId', {countUserId: userId})
          .orWhere('countPage.ownerId = :countUserId', {countUserId: userId})
          .orWhere('countMember.userId = :countUserId', {countUserId: userId});
      }),
    );

    if (filter) {
      statusCountsQuery.andWhere('countJob.filterId = :countFilterId', {
        countFilterId: Number(filter),
      });
    }

    if (search) {
      statusCountsQuery.andWhere(
        new Brackets((inner) => {
          inner
            .where('countJob.title LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countJob.description LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countPage.company_name LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countPage.username LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countCreator.full_name LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countCreator.firstName LIKE :countSearch', {countSearch: `%${search}%`})
            .orWhere('countCreator.lastName LIKE :countSearch', {countSearch: `%${search}%`});
        }),
      );
    }

    const rawStatusCounts = await statusCountsQuery
      .groupBy("COALESCE(countJob.status, 'active')")
      .getRawMany();

    const statusCounts = rawStatusCounts.reduce(
      (result, row) => {
        const rowStatus = String(row.status || '').toLowerCase();
        if (rowStatus === 'active' || rowStatus === 'closed') {
          result[rowStatus] = Number(row.count || 0);
        }
        return result;
      },
      {active: 0, closed: 0} as {active: number; closed: number},
    );

    return {
      ...baseResponse,
      statusCounts: {
        ...statusCounts,
        total: statusCounts.active + statusCounts.closed,
      },
    };
  }

  async findJobById(id: number, userId?: number) {
    const job = await this.findJobEntityForResponse(id);
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);
    if (job.moderationStatus && job.moderationStatus !== 'visible') {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    const status = job.status || (job.isActive ? 'active' : 'closed');
    let canManage = job.createdBy === userId;
    if (job.pageId && userId) {
      try {
        await this.assertCompanyPermission(
          job.pageId,
          Number(userId),
          'viewApplicants',
        );
        canManage = true;
      } catch {
        canManage = false;
      }
    }
    if (!canManage && status !== 'active') {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    if (!canManage) {
      if (
        job.creator?.isBanned ||
        job.creator?.deletedAt ||
        (job.pageId && job.page?.verificationStatus !== 'approved')
      ) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
      if (
        userId &&
        (await this.moderationService.isInteractionBlocked(
          userId,
          job.pageId ? 'company' : 'user',
          job.pageId || job.createdBy,
        ))
      ) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
    }

    return this.formatJob(job);
  }

  async updateJob(id: number, data: any, userId: number) {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['page', 'branch'],
    });

    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);

    let pageId =
      data.companyId !== undefined || data.pageId !== undefined
        ? this.optionalPositiveId(data.companyId ?? data.pageId) ?? null
        : job.pageId ?? null;
    let branchId =
      data.branchId !== undefined
        ? this.optionalPositiveId(data.branchId) ?? null
        : job.branchId ?? null;

    if (
      data.postingMode === 'individual' ||
      data.companyId === null ||
      data.pageId === null
    ) {
      pageId = null;
      branchId = null;
    }

    if (branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: branchId } });
      if (!branch) throw new BadRequestException('Branch not found');
      if (pageId && branch.companyId !== pageId) {
        throw new BadRequestException('Branch does not belong to company');
      }
      pageId = branch.companyId;
    }

    await this.assertJobUpdateAccess(job, pageId, userId);

    const status = (data.status || job.status || 'active') as JobStatus;
    const payload = this.normalizeJobPayload(
      { ...data, status, isRemote: data.isRemote ?? job.isRemote },
      pageId,
      branchId,
    );
    const locationUpdate = this.buildLocationUpdate(data, status);

    delete payload.createdBy;

    const updatePayload: any = { ...payload };
    if (locationUpdate !== undefined) updatePayload.location = locationUpdate;
    if (data.location === undefined) delete updatePayload.location;

    await this.jobRepo.update({ id }, updatePayload);

    return this.findJobById(id, userId);
  }

  async updateJobStatus(id: number, status: JobStatus, userId: number) {
    if (!['draft', 'active', 'closed'].includes(status)) {
      throw new BadRequestException('Invalid job status');
    }

    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    if (job.pageId) {
      await this.assertCompanyPermission(
        job.pageId,
        userId,
        'editJobs',
        status !== 'closed',
      );
    } else if (job.createdBy !== userId) {
      throw new ForbiddenException('You are not allowed to update this job');
    }

    await this.jobRepo.update(
      { id },
      {
        status,
        isActive: status === 'active',
      },
    );

    return this.findJobById(id, userId);
  }

  async closeJob(id: number, userId: number) {
    return this.updateJobStatus(id, 'closed', userId);
  }

  private async findJobEntityForResponse(id: number) {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.page', 'page')
      .leftJoinAndSelect('job.branch', 'branch')
      .leftJoinAndSelect('job.creator', 'creator')
      .loadRelationCountAndMap('job.applicationsCount', 'job.applications')
      .where('job.id = :id', { id });

    return qb.getOne();
  }

  private formatJob(job: Job & { applicationsCount?: number }) {
    const creatorName =
      job.creator?.full_name ||
      [job.creator?.firstName, job.creator?.lastName].filter(Boolean).join(' ');
    const companyName = job.page?.company_name || creatorName || 'Individual';
    const location = this.formatLocation(job.location);

    return {
      ...job,
      status: job.status || (job.isActive ? 'active' : 'closed'),
      applicationsCount: Number((job as any).applicationsCount || 0),
      companyId: job.pageId || null,
      companyName,
      employerName: companyName,
      employerType: job.pageId ? 'company' : 'individual',
      employer: {
        id: job.pageId || job.createdBy,
        type: job.pageId ? 'company' : 'individual',
        name: companyName,
        logoUrl: job.page?.company_logo || job.creator?.profile_photo || null,
      },
      pageTaggedJob: Boolean(job.pageId),
      page: job.pageId
        ? {
            id: job.page.id,
            company_name: job.page.company_name,
            username: job.page.username,
            company_logo: job.page.company_logo,
          }
        : null,
      branch: this.formatBranch(job.branch),
      location,
      positions: job.vacancies ?? null,
      payType: job.salaryType,
    };
  }

  private formatRawJob(job: any) {
    const creatorName =
      job.creator_full_name ||
      [job.creator_firstName, job.creator_lastName].filter(Boolean).join(' ');
    const companyName = job.company_name || creatorName || 'Individual';
    const location =
      job.lat === null || job.lng === null
        ? null
        : {
            lat: Number(job.lat),
            lng: Number(job.lng),
          };

    return {
      ...job,
      id: Number(job.id),
      filterId: Number(job.filterId),
      salaryAmount: Number(job.salaryAmount),
      applicationsCount: Number(job.applicationsCount || 0),
      distance: job.distance === null ? null : Number(job.distance),
      location,
      status: job.status || (job.isActive ? 'active' : 'closed'),
      companyId: job.page_id || null,
      companyName,
      employerName: companyName,
      employerType: job.page_id ? 'company' : 'individual',
      employer: {
        id: job.page_id || job.createdBy,
        type: job.page_id ? 'company' : 'individual',
        name: companyName,
        logoUrl: job.company_logo || job.creator_profile_photo || null,
      },
      pageTaggedJob: Boolean(job.page_id),
      page: job.page_id
        ? {
            id: job.page_id,
            company_name: job.company_name,
            username: job.page_username,
            company_logo: job.company_logo,
          }
        : null,
      branch: job.branch_id
        ? {
            id: job.branch_id,
            label: job.branch_label,
            address: job.branch_address,
            lat: job.branch_lat,
            lng: job.branch_lng,
          }
        : null,
      positions: job.vacancies ?? null,
      payType: job.salaryType,
    };
  }

  private formatLocation(location: any) {
    if (!location) return null;
    if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      return { lat: location.lat, lng: location.lng };
    }
    if (typeof location.y === 'number' && typeof location.x === 'number') {
      return { lat: location.y, lng: location.x };
    }
    return null;
  }

  private formatBranch(branch?: CompanyBranch | null) {
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
}
