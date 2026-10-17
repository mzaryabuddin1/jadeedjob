import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageVerificationRequest, VerificationDocument } from './entities/page-verification.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';
export declare const PRIVATE_UPLOAD_DIR = "./private-uploads";
export declare class PageVerificationService {
    private readonly requestRepo;
    private readonly pageRepo;
    private readonly userRepo;
    private readonly notificationService;
    private readonly logger;
    constructor(requestRepo: Repository<PageVerificationRequest>, pageRepo: Repository<Page>, userRepo: Repository<User>, notificationService: NotificationService);
    submit(page: Page, userId: number, files: Express.Multer.File[], body: {
        documentTypes?: string;
        notes?: string;
    }): Promise<{
        message: string;
        data: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            notes: string;
            rejectionReason: string;
            createdAt: Date;
            reviewedAt: Date;
            documents: {
                type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
                name: string;
                size: number;
            }[];
        };
    }>;
    private parseTypes;
    getStatus(page: Page): Promise<{
        is_verified: boolean;
        verified_at: Date;
        status: "pending" | "rejected" | "none" | "verified";
        latest: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            notes: string;
            rejectionReason: string;
            createdAt: Date;
            reviewedAt: Date;
            documents: {
                type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
                name: string;
                size: number;
            }[];
        };
        history: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            createdAt: Date;
            reviewedAt: Date;
            rejectionReason: string;
        }[];
        documentTypes: readonly ["business_license", "registration_certificate", "tax_document", "id_proof", "utility_bill", "other"];
    }>;
    private toPageView;
    adminList(status: string | undefined, limit?: number): Promise<{
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
    adminGet(id: number): Promise<{
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
    adminDocument(id: number, index: number): Promise<{
        path: string;
        doc: VerificationDocument;
    }>;
    approve(id: number, reviewer: string): Promise<{
        message: string;
        pageId: number;
    }>;
    reject(id: number, reason: string, reviewer: string): Promise<{
        message: string;
        pageId: number;
    }>;
    unverify(pageId: number, reason: string, reviewer: string): Promise<{
        message: string;
        pageId: number;
    }>;
    deleteFilesForPage(pageId: number): Promise<void>;
    discardUploads(files: Express.Multer.File[]): Promise<void>;
    private removeFiles;
    private requireRequest;
    private tell;
    private toAdminView;
}
