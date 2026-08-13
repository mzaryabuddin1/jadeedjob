export declare class LegalDocumentDto {
    documentType: 'terms' | 'privacy' | 'community_guidelines';
    version: string;
    title: string;
    contentUrl: string;
    effectiveAt: string;
    publishedAt: string;
}
export declare class LegalAcceptanceItemDto {
    documentType: 'terms' | 'privacy' | 'community_guidelines';
    version: string;
}
export declare class SubmitLegalAcceptancesDto {
    acceptances: LegalAcceptanceItemDto[];
    clientPlatform: 'ios' | 'android' | 'web' | 'unknown';
}
export declare class UserLegalAcceptanceDto extends LegalAcceptanceItemDto {
    clientPlatform: 'ios' | 'android' | 'web' | 'unknown';
    acceptedAt: string;
}
export declare class LegalAcceptanceRequiredDetailsDto {
    documentType: 'terms' | 'privacy' | 'community_guidelines';
    version: string;
}
export declare class LegalAcceptanceRequiredErrorDto {
    statusCode: number;
    error: string;
    code: string;
    message: string;
    details?: LegalAcceptanceRequiredDetailsDto;
}
