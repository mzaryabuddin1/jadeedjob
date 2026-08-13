export type LegalDocumentType = 'terms' | 'privacy' | 'community_guidelines';
export declare class LegalDocument {
    id: number;
    documentType: LegalDocumentType;
    version: string;
    title: string;
    contentUrl: string;
    effectiveAt: Date;
    publishedAt: Date;
    supersededAt: Date | null;
    isCurrent: boolean;
    publishedByAdminId: number | null;
    createdAt: Date;
}
