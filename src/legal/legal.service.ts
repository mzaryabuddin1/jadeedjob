import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
import {
  LegalDocument,
  LegalDocumentType,
} from './entities/legal-document.entity';
import { UserLegalAcceptance } from './entities/user-legal-acceptance.entity';

export type LegalAcceptanceInput = {
  documentType: LegalDocumentType;
  version: string;
};

export type LegalClientPlatform = 'ios' | 'android' | 'web' | 'unknown';

@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalDocument)
    private readonly documentRepo: Repository<LegalDocument>,
    @InjectRepository(UserLegalAcceptance)
    private readonly acceptanceRepo: Repository<UserLegalAcceptance>,
  ) {}

  async getCurrentDocuments() {
    const documents = await this.currentDocuments();
    return { data: documents.map((document) => this.formatDocument(document)) };
  }

  async getUserAcceptances(userId: number) {
    const [acceptances, current] = await Promise.all([
      this.acceptanceRepo.find({
        where: { userId },
        order: { acceptedAt: 'DESC' },
      }),
      this.currentDocuments(),
    ]);
    const acceptedKeys = new Set(
      acceptances.map((item) => `${item.documentType}:${item.version}`),
    );
    return {
      data: acceptances.map((item) => this.formatAcceptance(item)),
      current: current.map((item) => this.formatDocument(item)),
      missingCurrent: current
        .filter(
          (item) => !acceptedKeys.has(`${item.documentType}:${item.version}`),
        )
        .map((item) => ({
          documentType: item.documentType,
          version: item.version,
        })),
    };
  }

  async acceptDocuments(
    userId: number,
    acceptances: LegalAcceptanceInput[],
    clientPlatform: LegalClientPlatform,
  ) {
    const documents = await this.resolveCurrentAcceptances(acceptances);
    if (documents.length) {
      await this.acceptanceRepo
        .createQueryBuilder()
        .insert()
        .values(
          documents.map((document) => ({
            userId,
            legalDocumentId: document.id,
            documentType: document.documentType,
            version: document.version,
            clientPlatform,
          })),
        )
        .orIgnore()
        .execute();
    }
    return this.getUserAcceptances(userId);
  }

  async validateRegistrationAcceptances(
    acceptances: LegalAcceptanceInput[] | undefined,
  ) {
    if (!(await this.registrationEnforcementActive())) return;
    await this.assertPayloadContainsCurrent(
      acceptances || [],
      ['terms', 'privacy'],
    );
  }

  async recordRegistrationAcceptances(
    userId: number,
    acceptances: LegalAcceptanceInput[] | undefined,
    clientPlatform: LegalClientPlatform = 'unknown',
  ) {
    if (!acceptances?.length) return;
    await this.acceptDocuments(userId, acceptances, clientPlatform);
  }

  async assertCommunityAccepted(userId: number) {
    if (!(await this.communityEnforcementActive())) return;
    const document = await this.documentRepo.findOne({
      where: {
        documentType: 'community_guidelines',
        isCurrent: true,
        effectiveAt: LessThanOrEqual(new Date()),
      },
    });
    if (!document) return;
    const acceptance = await this.acceptanceRepo.findOne({
      where: { userId, legalDocumentId: document.id },
    });
    if (!acceptance) this.acceptanceRequired(document);
  }

  async registrationEnforcementActive() {
    if (
      !this.activationReached(
        'LEGAL_REGISTRATION_ENFORCEMENT_ENABLED',
        'LEGAL_REGISTRATION_ENFORCEMENT_AT',
      )
    ) {
      return false;
    }
    const documents = await this.documentRepo.find({
      where: {
        documentType: In(['terms', 'privacy']) as any,
        isCurrent: true,
        effectiveAt: LessThanOrEqual(new Date()),
      },
      select: ['documentType'],
    });
    return new Set(documents.map((item) => item.documentType)).size === 2;
  }

  async communityEnforcementActive() {
    if (
      !this.activationReached(
        'LEGAL_COMMUNITY_ENFORCEMENT_ENABLED',
        'LEGAL_COMMUNITY_ENFORCEMENT_AT',
      )
    ) {
      return false;
    }
    return Boolean(
      await this.documentRepo.findOne({
        where: {
          documentType: 'community_guidelines',
          isCurrent: true,
          effectiveAt: LessThanOrEqual(new Date()),
        },
        select: ['id'],
      }),
    );
  }

  private async assertPayloadContainsCurrent(
    acceptances: LegalAcceptanceInput[],
    requiredTypes: LegalDocumentType[],
  ) {
    const documents = await this.documentRepo.find({
      where: {
        documentType: In(requiredTypes) as any,
        isCurrent: true,
        effectiveAt: LessThanOrEqual(new Date()),
      },
    });
    for (const document of documents) {
      if (
        !acceptances.some(
          (item) =>
            item.documentType === document.documentType &&
            String(item.version) === document.version,
        )
      ) {
        this.acceptanceRequired(document);
      }
    }
  }

  private async resolveCurrentAcceptances(inputs: LegalAcceptanceInput[]) {
    const deduplicated = new Map<string, LegalAcceptanceInput>();
    for (const input of inputs) {
      deduplicated.set(`${input.documentType}:${input.version}`, input);
    }
    const documents = await this.currentDocuments();
    const currentByKey = new Map(
      documents.map((item) => [
        `${item.documentType}:${item.version}`,
        item,
      ]),
    );
    return [...deduplicated.keys()].map((key) => {
      const document = currentByKey.get(key);
      if (!document) {
        const [documentType, version] = key.split(':');
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'LEGAL_DOCUMENT_VERSION_INVALID',
          'Only a current legal document version can be accepted',
          { documentType, version },
        );
      }
      return document;
    });
  }

  private currentDocuments() {
    return this.documentRepo.find({
      where: { isCurrent: true },
      order: { documentType: 'ASC', effectiveAt: 'DESC' },
    });
  }

  private activationReached(enabledKey: string, activationKey: string) {
    if (process.env[enabledKey] !== 'true') return false;
    const activation = String(process.env[activationKey] || '').trim();
    if (!activation) return false;
    const time = new Date(activation).getTime();
    return Number.isFinite(time) && time <= Date.now();
  }

  private acceptanceRequired(document: LegalDocument): never {
    throw new ApiException(
      HttpStatus.PRECONDITION_REQUIRED,
      'LEGAL_ACCEPTANCE_REQUIRED',
      'Current legal acceptance is required',
      {
        documentType: document.documentType,
        version: document.version,
      },
    );
  }

  private formatDocument(document: LegalDocument) {
    return {
      documentType: document.documentType,
      version: document.version,
      title: document.title,
      contentUrl: document.contentUrl,
      effectiveAt: document.effectiveAt,
      publishedAt: document.publishedAt,
    };
  }

  private formatAcceptance(acceptance: UserLegalAcceptance) {
    return {
      documentType: acceptance.documentType,
      version: acceptance.version,
      clientPlatform: acceptance.clientPlatform,
      acceptedAt: acceptance.acceptedAt,
    };
  }
}
