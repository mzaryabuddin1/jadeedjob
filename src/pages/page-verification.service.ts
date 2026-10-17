import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, promises as fs } from 'fs';
import { basename, resolve } from 'path';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import {
  PageVerificationRequest,
  VERIFICATION_DOC_TYPES,
  VerificationDocType,
  VerificationDocument,
} from './entities/page-verification.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';

/**
 * Company documents (licence, registration, ID...) are sensitive: they are
 * stored OUTSIDE the public `/uploads` folder and can only be downloaded by
 * staff through the admin endpoints.
 */
export const PRIVATE_UPLOAD_DIR = './private-uploads';

@Injectable()
export class PageVerificationService {
  private readonly logger = new Logger(PageVerificationService.name);

  constructor(
    @InjectRepository(PageVerificationRequest)
    private readonly requestRepo: Repository<PageVerificationRequest>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  // ────────────────────────────────────────────────
  // PAGE SIDE
  // ────────────────────────────────────────────────

  /** Documents are already on disk (multer); this records the request */
  async submit(
    page: Page,
    userId: number,
    files: Express.Multer.File[],
    body: { documentTypes?: string; notes?: string },
  ) {
    const discard = () => this.removeFiles(files.map((f) => f.filename));

    try {
      if (page.is_verified) {
        throw new BadRequestException('This page is already verified');
      }
      if (!files?.length) {
        throw new BadRequestException(
          'Upload at least one document (field name: documents)',
        );
      }
      const pending = await this.requestRepo.exist({
        where: { pageId: page.id, status: 'pending' },
      });
      if (pending) {
        throw new BadRequestException(
          'A verification request is already waiting for review',
        );
      }

      const types = this.parseTypes(body.documentTypes, files.length);
      const documents: VerificationDocument[] = files.map((f, i) => ({
        type: types[i],
        originalName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
      }));

      const request = await this.requestRepo.save(
        this.requestRepo.create({
          pageId: page.id,
          submittedBy: userId,
          documents,
          notes: body.notes?.trim() || null,
          status: 'pending',
        }),
      );
      await this.pageRepo.update(page.id, { verification_status: 'pending' });

      return {
        message:
          'Documents received. Our team will review them and you will be notified',
        data: this.toPageView(request),
      };
    } catch (err) {
      await discard(); // do not keep files of a refused request
      throw err;
    }
  }

  /** Types come as JSON array or comma list, in the same order as the files */
  private parseTypes(
    raw: string | undefined,
    count: number,
  ): VerificationDocType[] {
    let list: string[] = [];
    if (raw) {
      const text = String(raw).trim();
      try {
        const parsed = JSON.parse(text);
        list = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        list = text.split(',').map((s) => s.trim());
      }
    }
    const out: VerificationDocType[] = [];
    for (let i = 0; i < count; i++) {
      const t = (list[i] || 'other') as VerificationDocType;
      if (!VERIFICATION_DOC_TYPES.includes(t)) {
        throw new BadRequestException(
          `Invalid document type "${t}". Use: ${VERIFICATION_DOC_TYPES.join(', ')}`,
        );
      }
      out.push(t);
    }
    return out;
  }

  async getStatus(page: Page) {
    const requests = await this.requestRepo.find({
      where: { pageId: page.id },
      order: { id: 'DESC' },
      take: 10,
    });

    return {
      is_verified: page.is_verified,
      verified_at: page.verified_at,
      status: page.verification_status,
      latest: requests[0] ? this.toPageView(requests[0]) : null,
      history: requests.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        rejectionReason: r.rejectionReason,
      })),
      documentTypes: VERIFICATION_DOC_TYPES,
    };
  }

  /** What the page side may see (never the stored file names) */
  private toPageView(r: PageVerificationRequest) {
    return {
      id: r.id,
      status: r.status,
      notes: r.notes,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      documents: r.documents.map((d) => ({
        type: d.type,
        name: d.originalName,
        size: d.size,
      })),
    };
  }

  // ────────────────────────────────────────────────
  // STAFF SIDE (admin endpoints)
  // ────────────────────────────────────────────────

  async adminList(status: string | undefined, limit = 50) {
    const take = Math.min(200, Math.max(1, limit));
    const where =
      status && ['pending', 'approved', 'rejected'].includes(status)
        ? { status: status as PageVerificationRequest['status'] }
        : {};

    const requests = await this.requestRepo.find({
      where,
      order: { id: 'DESC' },
      take,
    });
    return Promise.all(requests.map((r) => this.toAdminView(r)));
  }

  async adminGet(id: number) {
    return this.toAdminView(await this.requireRequest(id));
  }

  /** Absolute path + metadata of one uploaded document */
  async adminDocument(id: number, index: number) {
    const request = await this.requireRequest(id);
    const doc = request.documents[index];
    if (!doc) throw new NotFoundException('Document not found');

    const path = resolve(PRIVATE_UPLOAD_DIR, basename(doc.storedName));
    if (!existsSync(path)) {
      throw new NotFoundException('The file is missing on the server');
    }
    return { path, doc };
  }

  async approve(id: number, reviewer: string) {
    const request = await this.requireRequest(id);
    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const res = await this.requestRepo.update(
      { id, status: 'pending' },
      { status: 'approved', reviewedBy: reviewer, reviewedAt: new Date() },
    );
    if (!res.affected)
      throw new BadRequestException('Request was already decided');

    await this.pageRepo.update(request.pageId, {
      is_verified: true,
      verified_at: new Date(),
      verification_status: 'verified',
    });

    const page = await this.pageRepo.findOne({ where: { id: request.pageId } });
    await this.tell(page, request.submittedBy, {
      title: 'Page verified',
      body: `"${page?.page_name}" is now verified. The verified tick is live on your page`,
      type: 'page_verified',
    });

    return { message: 'Page verified', pageId: request.pageId };
  }

  async reject(id: number, reason: string, reviewer: string) {
    const request = await this.requireRequest(id);
    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const res = await this.requestRepo.update(
      { id, status: 'pending' },
      {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: reviewer,
        reviewedAt: new Date(),
      },
    );
    if (!res.affected)
      throw new BadRequestException('Request was already decided');

    await this.pageRepo.update(request.pageId, {
      is_verified: false,
      verification_status: 'rejected',
    });

    const page = await this.pageRepo.findOne({ where: { id: request.pageId } });
    await this.tell(page, request.submittedBy, {
      title: 'Verification needs changes',
      body: `"${page?.page_name}" was not verified: ${reason}. You can send new documents`,
      type: 'page_verification_rejected',
    });

    return { message: 'Request rejected', pageId: request.pageId };
  }

  /** Staff removes the tick later (e.g. documents turned out to be fake) */
  async unverify(pageId: number, reason: string, reviewer: string) {
    const page = await this.pageRepo.findOne({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');
    if (!page.is_verified)
      throw new BadRequestException('Page is not verified');

    await this.pageRepo.update(pageId, {
      is_verified: false,
      verified_at: null,
      verification_status: 'none',
    });
    this.logger.warn(`Page #${pageId} un-verified by ${reviewer}: ${reason}`);

    await this.tell(page, page.ownerId, {
      title: 'Verification removed',
      body: `The verified tick of "${page.page_name}" was removed: ${reason}`,
      type: 'page_unverified',
    });

    return { message: 'Verification removed', pageId };
  }

  // ────────────────────────────────────────────────
  // cleanup + helpers
  // ────────────────────────────────────────────────

  /** Called when a page is deleted: its documents must not stay on disk */
  async deleteFilesForPage(pageId: number) {
    const requests = await this.requestRepo.find({ where: { pageId } });
    await this.removeFiles(
      requests.flatMap((r) => r.documents.map((d) => d.storedName)),
    );
  }

  /** Remove files multer already wrote for a request that got refused */
  async discardUploads(files: Express.Multer.File[]) {
    await this.removeFiles((files ?? []).map((f) => f.filename));
  }

  private async removeFiles(names: string[]) {
    for (const name of names) {
      try {
        await fs.unlink(resolve(PRIVATE_UPLOAD_DIR, basename(name)));
      } catch {
        /* already gone */
      }
    }
  }

  private async requireRequest(id: number) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Verification request not found');
    return request;
  }

  private async tell(
    page: Page | null,
    userId: number,
    msg: { title: string; body: string; type: string },
  ) {
    await this.notificationService.notifyUser(userId, {
      title: msg.title,
      body: msg.body,
      data: {
        type: msg.type,
        pageId: page?.id,
        pageName: page?.page_name,
        path: (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace(
          '{id}',
          String(page?.id ?? ''),
        ),
      },
    });
  }

  private async toAdminView(r: PageVerificationRequest) {
    const page = await this.pageRepo.findOne({ where: { id: r.pageId } });
    const submitter = await this.userRepo.findOne({
      where: { id: r.submittedBy },
      select: ['id', 'firstName', 'lastName', 'username', 'email', 'phone'],
    });

    return {
      id: r.id,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      rejectionReason: r.rejectionReason,
      documents: r.documents.map((d, index) => ({
        index,
        type: d.type,
        name: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
      })),
      page: page && {
        id: page.id,
        page_name: page.page_name,
        username: page.username,
        business_name: page.business_name,
        website_url: page.website_url,
        official_email: page.official_email,
        official_phone: page.official_phone,
        country: page.country,
        city: page.city,
        business_registration_number: page.business_registration_number,
        tax_identification_number: page.tax_identification_number,
        registration_authority: page.registration_authority,
        is_verified: page.is_verified,
        verification_status: page.verification_status,
      },
      submittedBy: submitter && {
        id: submitter.id,
        name: `${submitter.firstName ?? ''} ${submitter.lastName ?? ''}`.trim(),
        username: submitter.username,
        email: submitter.email,
        phone: submitter.phone,
      },
    };
  }
}
