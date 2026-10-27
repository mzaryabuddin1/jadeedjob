import { ProfileService } from './profile.service';
export declare class ProfileController {
    private readonly profile;
    constructor(profile: ProfileService);
    myProfile(req: any): Promise<Record<string, any>>;
    updateProfile(data: any, req: any): Promise<Record<string, any>>;
    addExperience(data: any, req: any): Promise<{
        experience_certificate?: string;
        id: number;
        company_name: string;
        designation: string;
        department: string;
        employment_type: string;
        location: any;
        from_date: Date;
        to_date: Date;
        currently_working: boolean;
        key_responsibilities: string;
        page: any;
    }>;
    updateExperience(id: number, data: any, req: any): Promise<{
        experience_certificate?: string;
        id: number;
        company_name: string;
        designation: string;
        department: string;
        employment_type: string;
        location: any;
        from_date: Date;
        to_date: Date;
        currently_working: boolean;
        key_responsibilities: string;
        page: any;
    }>;
    removeExperience(id: number, req: any): Promise<{
        message: string;
    }>;
    addEducation(data: any, req: any): Promise<{
        degree_document?: string;
        id: number;
        institution_name: string;
        highest_qualification: string;
        field_of_study: string;
        start_year: string;
        graduation_year: string;
        gpa_or_grade: string;
        description: string;
    }>;
    updateEducation(id: number, data: any, req: any): Promise<{
        degree_document?: string;
        id: number;
        institution_name: string;
        highest_qualification: string;
        field_of_study: string;
        start_year: string;
        graduation_year: string;
        gpa_or_grade: string;
        description: string;
    }>;
    removeEducation(id: number, req: any): Promise<{
        message: string;
    }>;
    addCertification(data: any, req: any): Promise<{
        certificate_file?: string;
        id: number;
        certification_name: string;
        issuing_institution: string;
        certification_date: Date;
        expiry_date: Date;
        credential_id: string;
        credential_url: string;
    }>;
    updateCertification(id: number, data: any, req: any): Promise<{
        certificate_file?: string;
        id: number;
        certification_name: string;
        issuing_institution: string;
        certification_date: Date;
        expiry_date: Date;
        credential_id: string;
        credential_url: string;
    }>;
    removeCertification(id: number, req: any): Promise<{
        message: string;
    }>;
    myLanguages(req: any): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }[]>;
    addLanguage(data: any, req: any): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }>;
    updateLanguage(id: number, data: any, req: any): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }>;
    removeLanguage(id: number, req: any): Promise<{
        message: string;
    }>;
    userProfile(userId: number, req: any): Promise<Record<string, any>>;
}
