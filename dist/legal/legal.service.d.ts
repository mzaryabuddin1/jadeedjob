import { Repository } from 'typeorm';
import { LegalDocument, LegalDocumentType } from './entities/legal-document.entity';
import { UserLegalAcceptance } from './entities/user-legal-acceptance.entity';
export type LegalAcceptanceInput = {
    documentType: LegalDocumentType;
    version: string;
};
export type LegalClientPlatform = 'ios' | 'android' | 'web' | 'unknown';
export declare class LegalService {
    private readonly documentRepo;
    private readonly acceptanceRepo;
    constructor(documentRepo: Repository<LegalDocument>, acceptanceRepo: Repository<UserLegalAcceptance>);
    getCurrentDocuments(): Promise<{
        data: {
            documentType: LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
    }>;
    getUserAcceptances(userId: number): Promise<{
        data: {
            documentType: LegalDocumentType;
            version: string;
            clientPlatform: "ios" | "android" | "web" | "unknown";
            acceptedAt: Date;
        }[];
        current: {
            documentType: LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
        missingCurrent: {
            documentType: LegalDocumentType;
            version: string;
        }[];
    }>;
    acceptDocuments(userId: number, acceptances: LegalAcceptanceInput[], clientPlatform: LegalClientPlatform): Promise<{
        data: {
            documentType: LegalDocumentType;
            version: string;
            clientPlatform: "ios" | "android" | "web" | "unknown";
            acceptedAt: Date;
        }[];
        current: {
            documentType: LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
        missingCurrent: {
            documentType: LegalDocumentType;
            version: string;
        }[];
    }>;
    validateRegistrationAcceptances(acceptances: LegalAcceptanceInput[] | undefined): Promise<void>;
    recordRegistrationAcceptances(userId: number, acceptances: LegalAcceptanceInput[] | undefined, clientPlatform?: LegalClientPlatform): Promise<void>;
    assertCommunityAccepted(userId: number): Promise<void>;
    registrationEnforcementActive(): Promise<boolean>;
    communityEnforcementActive(): Promise<boolean>;
    private assertPayloadContainsCurrent;
    private resolveCurrentAcceptances;
    private currentDocuments;
    private activationReached;
    private acceptanceRequired;
    private formatDocument;
    private formatAcceptance;
}
