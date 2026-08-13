import { LegalService } from './legal.service';
export declare class LegalController {
    private readonly legalService;
    constructor(legalService: LegalService);
    current(): Promise<{
        data: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
    }>;
}
export declare class UserLegalAcceptancesController {
    private readonly legalService;
    constructor(legalService: LegalService);
    list(req: any): Promise<{
        data: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
            clientPlatform: "ios" | "android" | "web" | "unknown";
            acceptedAt: Date;
        }[];
        current: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
        missingCurrent: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
        }[];
    }>;
    accept(req: any, body: any): Promise<{
        data: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
            clientPlatform: "ios" | "android" | "web" | "unknown";
            acceptedAt: Date;
        }[];
        current: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
            title: string;
            contentUrl: string;
            effectiveAt: Date;
            publishedAt: Date;
        }[];
        missingCurrent: {
            documentType: import("./entities/legal-document.entity").LegalDocumentType;
            version: string;
        }[];
    }>;
}
