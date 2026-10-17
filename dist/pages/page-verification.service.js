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
var PageVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageVerificationService = exports.PRIVATE_UPLOAD_DIR = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
const typeorm_2 = require("typeorm");
const page_entity_1 = require("./entities/page.entity");
const page_verification_entity_1 = require("./entities/page-verification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_service_1 = require("../notification/notification.service");
exports.PRIVATE_UPLOAD_DIR = './private-uploads';
let PageVerificationService = PageVerificationService_1 = class PageVerificationService {
    constructor(requestRepo, pageRepo, userRepo, notificationService) {
        this.requestRepo = requestRepo;
        this.pageRepo = pageRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(PageVerificationService_1.name);
    }
    async submit(page, userId, files, body) {
        const discard = () => this.removeFiles(files.map((f) => f.filename));
        try {
            if (page.is_verified) {
                throw new common_1.BadRequestException('This page is already verified');
            }
            if (!files?.length) {
                throw new common_1.BadRequestException('Upload at least one document (field name: documents)');
            }
            const pending = await this.requestRepo.exist({
                where: { pageId: page.id, status: 'pending' },
            });
            if (pending) {
                throw new common_1.BadRequestException('A verification request is already waiting for review');
            }
            const types = this.parseTypes(body.documentTypes, files.length);
            const documents = files.map((f, i) => ({
                type: types[i],
                originalName: f.originalname,
                storedName: f.filename,
                mimeType: f.mimetype,
                size: f.size,
            }));
            const request = await this.requestRepo.save(this.requestRepo.create({
                pageId: page.id,
                submittedBy: userId,
                documents,
                notes: body.notes?.trim() || null,
                status: 'pending',
            }));
            await this.pageRepo.update(page.id, { verification_status: 'pending' });
            return {
                message: 'Documents received. Our team will review them and you will be notified',
                data: this.toPageView(request),
            };
        }
        catch (err) {
            await discard();
            throw err;
        }
    }
    parseTypes(raw, count) {
        let list = [];
        if (raw) {
            const text = String(raw).trim();
            try {
                const parsed = JSON.parse(text);
                list = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
            }
            catch {
                list = text.split(',').map((s) => s.trim());
            }
        }
        const out = [];
        for (let i = 0; i < count; i++) {
            const t = (list[i] || 'other');
            if (!page_verification_entity_1.VERIFICATION_DOC_TYPES.includes(t)) {
                throw new common_1.BadRequestException(`Invalid document type "${t}". Use: ${page_verification_entity_1.VERIFICATION_DOC_TYPES.join(', ')}`);
            }
            out.push(t);
        }
        return out;
    }
    async getStatus(page) {
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
            documentTypes: page_verification_entity_1.VERIFICATION_DOC_TYPES,
        };
    }
    toPageView(r) {
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
    async adminList(status, limit = 50) {
        const take = Math.min(200, Math.max(1, limit));
        const where = status && ['pending', 'approved', 'rejected'].includes(status)
            ? { status: status }
            : {};
        const requests = await this.requestRepo.find({
            where,
            order: { id: 'DESC' },
            take,
        });
        return Promise.all(requests.map((r) => this.toAdminView(r)));
    }
    async adminGet(id) {
        return this.toAdminView(await this.requireRequest(id));
    }
    async adminDocument(id, index) {
        const request = await this.requireRequest(id);
        const doc = request.documents[index];
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        const path = (0, path_1.resolve)(exports.PRIVATE_UPLOAD_DIR, (0, path_1.basename)(doc.storedName));
        if (!(0, fs_1.existsSync)(path)) {
            throw new common_1.NotFoundException('The file is missing on the server');
        }
        return { path, doc };
    }
    async approve(id, reviewer) {
        const request = await this.requireRequest(id);
        if (request.status !== 'pending') {
            throw new common_1.BadRequestException(`Request is already ${request.status}`);
        }
        const res = await this.requestRepo.update({ id, status: 'pending' }, { status: 'approved', reviewedBy: reviewer, reviewedAt: new Date() });
        if (!res.affected)
            throw new common_1.BadRequestException('Request was already decided');
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
    async reject(id, reason, reviewer) {
        const request = await this.requireRequest(id);
        if (request.status !== 'pending') {
            throw new common_1.BadRequestException(`Request is already ${request.status}`);
        }
        const res = await this.requestRepo.update({ id, status: 'pending' }, {
            status: 'rejected',
            rejectionReason: reason,
            reviewedBy: reviewer,
            reviewedAt: new Date(),
        });
        if (!res.affected)
            throw new common_1.BadRequestException('Request was already decided');
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
    async unverify(pageId, reason, reviewer) {
        const page = await this.pageRepo.findOne({ where: { id: pageId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        if (!page.is_verified)
            throw new common_1.BadRequestException('Page is not verified');
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
    async deleteFilesForPage(pageId) {
        const requests = await this.requestRepo.find({ where: { pageId } });
        await this.removeFiles(requests.flatMap((r) => r.documents.map((d) => d.storedName)));
    }
    async discardUploads(files) {
        await this.removeFiles((files ?? []).map((f) => f.filename));
    }
    async removeFiles(names) {
        for (const name of names) {
            try {
                await fs_1.promises.unlink((0, path_1.resolve)(exports.PRIVATE_UPLOAD_DIR, (0, path_1.basename)(name)));
            }
            catch {
            }
        }
    }
    async requireRequest(id) {
        const request = await this.requestRepo.findOne({ where: { id } });
        if (!request)
            throw new common_1.NotFoundException('Verification request not found');
        return request;
    }
    async tell(page, userId, msg) {
        await this.notificationService.notifyUser(userId, {
            title: msg.title,
            body: msg.body,
            data: {
                type: msg.type,
                pageId: page?.id,
                pageName: page?.page_name,
                path: (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace('{id}', String(page?.id ?? '')),
            },
        });
    }
    async toAdminView(r) {
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
};
exports.PageVerificationService = PageVerificationService;
exports.PageVerificationService = PageVerificationService = PageVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(page_verification_entity_1.PageVerificationRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notification_service_1.NotificationService])
], PageVerificationService);
//# sourceMappingURL=page-verification.service.js.map