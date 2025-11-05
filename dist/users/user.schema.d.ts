import { Document, Types } from 'mongoose';
export declare class WorkExperience {
    company_name?: string;
    designation?: string;
    department?: string;
    employment_type?: string;
    from_date?: Date;
    to_date?: Date;
    key_responsibilities?: string;
    experience_certificate?: string;
    currently_working?: boolean;
}
export declare const WorkExperienceSchema: import("mongoose").Schema<WorkExperience, import("mongoose").Model<WorkExperience, any, any, any, Document<unknown, any, WorkExperience, any> & WorkExperience & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WorkExperience, Document<unknown, {}, import("mongoose").FlatRecord<WorkExperience>, {}> & import("mongoose").FlatRecord<WorkExperience> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Education {
    highest_qualification?: string;
    institution_name?: string;
    graduation_year?: string;
    gpa_or_grade?: string;
    degree_document?: string;
}
export declare const EducationSchema: import("mongoose").Schema<Education, import("mongoose").Model<Education, any, any, any, Document<unknown, any, Education, any> & Education & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Education, Document<unknown, {}, import("mongoose").FlatRecord<Education>, {}> & import("mongoose").FlatRecord<Education> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Certification {
    certification_name?: string;
    issuing_institution?: string;
    certification_date?: Date;
    certificate_file?: string;
}
export declare const CertificationSchema: import("mongoose").Schema<Certification, import("mongoose").Model<Certification, any, any, any, Document<unknown, any, Certification, any> & Certification & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Certification, Document<unknown, {}, import("mongoose").FlatRecord<Certification>, {}> & import("mongoose").FlatRecord<Certification> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class User extends Document {
    firstName: string;
    lastName: string;
    passwordHash: string;
    passwordSalt: string;
    country: Types.ObjectId;
    language: Types.ObjectId;
    phone: string;
    email?: string;
    isVerified: boolean;
    isBanned: boolean;
    full_name?: string;
    father_name?: string;
    gender?: string;
    date_of_birth?: Date;
    nationality?: string;
    marital_status?: string;
    profile_photo?: string;
    alternate_phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    contact_country?: string;
    national_id_number?: string;
    passport_number?: string;
    id_expiry_date?: Date;
    id_document_front?: string;
    id_document_back?: string;
    address_proof_document?: string;
    professional_summary?: string;
    work_experience?: WorkExperience[];
    education?: Education[];
    certifications?: Certification[];
    skills?: string[];
    technical_skills?: string[];
    soft_skills?: string[];
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    behance_url?: string;
    bank_name?: string;
    account_number?: string;
    iban?: string;
    branch_name?: string;
    swift_code?: string;
    kyc_status: string;
    verified_by_admin_id?: Types.ObjectId;
    verification_date?: Date;
    rejection_reason?: string;
    notes?: string;
    filter_preferences?: Types.ObjectId[];
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any> & User & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}> & import("mongoose").FlatRecord<User> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
