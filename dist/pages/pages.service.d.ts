import { Repository } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';
export declare class PagesService {
    private readonly pageRepo;
    constructor(pageRepo: Repository<CompanyPage>);
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: CompanyPage[];
    }>;
    getPages(query: any, userId: number): Promise<{
        data: {
            mine: boolean;
            id: number;
            company_name: string;
            business_name: string;
            username: string;
            company_logo: string;
            website_url: string;
            official_email: string;
            official_phone: string;
            industry_type: string;
            company_description: string;
            founded_year: number;
            country: string;
            state: string;
            city: string;
            postal_code: string;
            address_line1: string;
            address_line2: string;
            google_maps_link: string;
            business_registration_number: string;
            tax_identification_number: string;
            registration_authority: string;
            business_license_document: string;
            company_type: string;
            representative_name: string;
            representative_designation: string;
            representative_email: string;
            representative_phone: string;
            id_proof_document: string;
            linkedin_page_url: string;
            facebook_page_url: string;
            instagram_page_url: string;
            twitter_page_url: string;
            youtube_channel_url: string;
            verified_email_domain: string;
            number_of_employees: number;
            annual_revenue_range: string;
            client_list: string[];
            certifications: string[];
            company_rating: number;
            ownerId: number;
            owner: import("../users/entities/user.entity").User;
            members: import("./entities/page-member.entity").PageMember[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getPageById(id: number): Promise<CompanyPage>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: CompanyPage;
    }>;
    deletePage(id: number, userId: number): Promise<{
        message: string;
    }>;
}
