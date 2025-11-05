import { Document, Types } from 'mongoose';
export declare class Page extends Document {
    owner: Types.ObjectId;
    company_name: string;
    business_name: string;
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
    verification_status: 'pending' | 'verified' | 'rejected';
    verification_date: Date;
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
    verified_by_admin_id?: Types.ObjectId;
    verification_notes: string;
    verification_documents: string[];
    rejection_reason: string;
    number_of_employees?: number;
    annual_revenue_range?: string;
    client_list?: string[];
    certifications?: string[];
    company_rating?: number;
}
export declare const PageSchema: import("mongoose").Schema<Page, import("mongoose").Model<Page, any, any, any, Document<unknown, any, Page, any> & Page & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Page, Document<unknown, {}, import("mongoose").FlatRecord<Page>, {}> & import("mongoose").FlatRecord<Page> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
