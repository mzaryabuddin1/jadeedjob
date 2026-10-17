import { StreamableFile } from '@nestjs/common';
import { PageVerificationService } from './page-verification.service';
export declare class AdminPageVerificationController {
    private readonly service;
    constructor(service: PageVerificationService);
    private reviewer;
    list(status?: string, limit?: string): Promise<{
        id: number;
        status: import("./entities/page-verification.entity").VerificationRequestStatus;
        notes: string;
        createdAt: Date;
        reviewedBy: string;
        reviewedAt: Date;
        rejectionReason: string;
        documents: {
            index: number;
            type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
            name: string;
            mimeType: string;
            size: number;
        }[];
        page: {
            id: number;
            page_name: string;
            username: string;
            business_name: string;
            website_url: string;
            official_email: string;
            official_phone: string;
            country: string;
            city: string;
            business_registration_number: string;
            tax_identification_number: string;
            registration_authority: string;
            is_verified: boolean;
            verification_status: "pending" | "rejected" | "none" | "verified";
        };
        submittedBy: {
            id: number;
            name: string;
            username: string;
            email: string;
            phone: string;
        };
    }[]>;
    get(id: number): Promise<{
        id: number;
        status: import("./entities/page-verification.entity").VerificationRequestStatus;
        notes: string;
        createdAt: Date;
        reviewedBy: string;
        reviewedAt: Date;
        rejectionReason: string;
        documents: {
            index: number;
            type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
            name: string;
            mimeType: string;
            size: number;
        }[];
        page: {
            id: number;
            page_name: string;
            username: string;
            business_name: string;
            website_url: string;
            official_email: string;
            official_phone: string;
            country: string;
            city: string;
            business_registration_number: string;
            tax_identification_number: string;
            registration_authority: string;
            is_verified: boolean;
            verification_status: "pending" | "rejected" | "none" | "verified";
        };
        submittedBy: {
            id: number;
            name: string;
            username: string;
            email: string;
            phone: string;
        };
    }>;
    document(id: number, index: number): Promise<StreamableFile>;
    approve(id: number, req: any): Promise<{
        message: string;
        pageId: number;
    }>;
    reject(id: number, body: {
        reason?: string;
    }, req: any): Promise<{
        message: string;
        pageId: number;
    }>;
    unverify(pageId: number, body: {
        reason?: string;
    }, req: any): Promise<{
        message: string;
        pageId: number;
    }>;
}
