import { User } from 'src/users/entities/user.entity';
import { LegalDocument, LegalDocumentType } from './legal-document.entity';
export declare class UserLegalAcceptance {
    id: number;
    userId: number;
    user: User;
    legalDocumentId: number;
    legalDocument: LegalDocument;
    documentType: LegalDocumentType;
    version: string;
    clientPlatform: 'ios' | 'android' | 'web' | 'unknown';
    acceptedAt: Date;
}
