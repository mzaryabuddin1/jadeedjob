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
exports.LegalService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const api_exception_1 = require("../common/errors/api-exception");
const legal_document_entity_1 = require("./entities/legal-document.entity");
const user_legal_acceptance_entity_1 = require("./entities/user-legal-acceptance.entity");
let LegalService = class LegalService {
    constructor(documentRepo, acceptanceRepo) {
        this.documentRepo = documentRepo;
        this.acceptanceRepo = acceptanceRepo;
    }
    async getCurrentDocuments() {
        const documents = await this.currentDocuments();
        return { data: documents.map((document) => this.formatDocument(document)) };
    }
    async getUserAcceptances(userId) {
        const [acceptances, current] = await Promise.all([
            this.acceptanceRepo.find({
                where: { userId },
                order: { acceptedAt: 'DESC' },
            }),
            this.currentDocuments(),
        ]);
        const acceptedKeys = new Set(acceptances.map((item) => `${item.documentType}:${item.version}`));
        return {
            data: acceptances.map((item) => this.formatAcceptance(item)),
            current: current.map((item) => this.formatDocument(item)),
            missingCurrent: current
                .filter((item) => !acceptedKeys.has(`${item.documentType}:${item.version}`))
                .map((item) => ({
                documentType: item.documentType,
                version: item.version,
            })),
        };
    }
    async acceptDocuments(userId, acceptances, clientPlatform) {
        const documents = await this.resolveCurrentAcceptances(acceptances);
        if (documents.length) {
            await this.acceptanceRepo
                .createQueryBuilder()
                .insert()
                .values(documents.map((document) => ({
                userId,
                legalDocumentId: document.id,
                documentType: document.documentType,
                version: document.version,
                clientPlatform,
            })))
                .orIgnore()
                .execute();
        }
        return this.getUserAcceptances(userId);
    }
    async validateRegistrationAcceptances(acceptances) {
        if (!(await this.registrationEnforcementActive()))
            return;
        await this.assertPayloadContainsCurrent(acceptances || [], ['terms', 'privacy']);
    }
    async recordRegistrationAcceptances(userId, acceptances, clientPlatform = 'unknown') {
        if (!acceptances?.length)
            return;
        await this.acceptDocuments(userId, acceptances, clientPlatform);
    }
    async assertCommunityAccepted(userId) {
        if (!(await this.communityEnforcementActive()))
            return;
        const document = await this.documentRepo.findOne({
            where: {
                documentType: 'community_guidelines',
                isCurrent: true,
                effectiveAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
        });
        if (!document)
            return;
        const acceptance = await this.acceptanceRepo.findOne({
            where: { userId, legalDocumentId: document.id },
        });
        if (!acceptance)
            this.acceptanceRequired(document);
    }
    async registrationEnforcementActive() {
        if (!this.activationReached('LEGAL_REGISTRATION_ENFORCEMENT_ENABLED', 'LEGAL_REGISTRATION_ENFORCEMENT_AT')) {
            return false;
        }
        const documents = await this.documentRepo.find({
            where: {
                documentType: (0, typeorm_2.In)(['terms', 'privacy']),
                isCurrent: true,
                effectiveAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
            select: ['documentType'],
        });
        return new Set(documents.map((item) => item.documentType)).size === 2;
    }
    async communityEnforcementActive() {
        if (!this.activationReached('LEGAL_COMMUNITY_ENFORCEMENT_ENABLED', 'LEGAL_COMMUNITY_ENFORCEMENT_AT')) {
            return false;
        }
        return Boolean(await this.documentRepo.findOne({
            where: {
                documentType: 'community_guidelines',
                isCurrent: true,
                effectiveAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
            select: ['id'],
        }));
    }
    async assertPayloadContainsCurrent(acceptances, requiredTypes) {
        const documents = await this.documentRepo.find({
            where: {
                documentType: (0, typeorm_2.In)(requiredTypes),
                isCurrent: true,
                effectiveAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
        });
        for (const document of documents) {
            if (!acceptances.some((item) => item.documentType === document.documentType &&
                String(item.version) === document.version)) {
                this.acceptanceRequired(document);
            }
        }
    }
    async resolveCurrentAcceptances(inputs) {
        const deduplicated = new Map();
        for (const input of inputs) {
            deduplicated.set(`${input.documentType}:${input.version}`, input);
        }
        const documents = await this.currentDocuments();
        const currentByKey = new Map(documents.map((item) => [
            `${item.documentType}:${item.version}`,
            item,
        ]));
        return [...deduplicated.keys()].map((key) => {
            const document = currentByKey.get(key);
            if (!document) {
                const [documentType, version] = key.split(':');
                throw new api_exception_1.ApiException(common_1.HttpStatus.BAD_REQUEST, 'LEGAL_DOCUMENT_VERSION_INVALID', 'Only a current legal document version can be accepted', { documentType, version });
            }
            return document;
        });
    }
    currentDocuments() {
        return this.documentRepo.find({
            where: { isCurrent: true },
            order: { documentType: 'ASC', effectiveAt: 'DESC' },
        });
    }
    activationReached(enabledKey, activationKey) {
        if (process.env[enabledKey] !== 'true')
            return false;
        const activation = String(process.env[activationKey] || '').trim();
        if (!activation)
            return false;
        const time = new Date(activation).getTime();
        return Number.isFinite(time) && time <= Date.now();
    }
    acceptanceRequired(document) {
        throw new api_exception_1.ApiException(common_1.HttpStatus.PRECONDITION_REQUIRED, 'LEGAL_ACCEPTANCE_REQUIRED', 'Current legal acceptance is required', {
            documentType: document.documentType,
            version: document.version,
        });
    }
    formatDocument(document) {
        return {
            documentType: document.documentType,
            version: document.version,
            title: document.title,
            contentUrl: document.contentUrl,
            effectiveAt: document.effectiveAt,
            publishedAt: document.publishedAt,
        };
    }
    formatAcceptance(acceptance) {
        return {
            documentType: acceptance.documentType,
            version: acceptance.version,
            clientPlatform: acceptance.clientPlatform,
            acceptedAt: acceptance.acceptedAt,
        };
    }
};
exports.LegalService = LegalService;
exports.LegalService = LegalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(legal_document_entity_1.LegalDocument)),
    __param(1, (0, typeorm_1.InjectRepository)(user_legal_acceptance_entity_1.UserLegalAcceptance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LegalService);
//# sourceMappingURL=legal.service.js.map