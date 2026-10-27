import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { WorkExperience } from 'src/users/entities/work-experience.entity';
import { Education } from 'src/users/entities/education.entity';
import { Certification } from 'src/users/entities/certification.entity';
import { UserLanguage } from 'src/users/entities/user-language.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { FollowService } from 'src/follow/follow.service';
import { Post } from 'src/posts/entities/post.entity';
export declare class ProfileService {
    private readonly userRepo;
    private readonly expRepo;
    private readonly eduRepo;
    private readonly certRepo;
    private readonly langRepo;
    private readonly pageRepo;
    private readonly memberRepo;
    private readonly postRepo;
    private readonly followService;
    constructor(userRepo: Repository<User>, expRepo: Repository<WorkExperience>, eduRepo: Repository<Education>, certRepo: Repository<Certification>, langRepo: Repository<UserLanguage>, pageRepo: Repository<Page>, memberRepo: Repository<PageMember>, postRepo: Repository<Post>, followService: FollowService);
    getProfile(targetId: number, viewerId: number): Promise<Record<string, any>>;
    private experienceView;
    private educationView;
    private certificationView;
    private languageView;
    private languageViews;
    private pageCards;
    private managedPages;
    updateProfile(userId: number, data: any): Promise<Record<string, any>>;
    addExperience(userId: number, data: any): Promise<{
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
    updateExperience(userId: number, id: number, data: any): Promise<{
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
    removeExperience(userId: number, id: number): Promise<{
        message: string;
    }>;
    private ownExperience;
    private oneExperience;
    private normalizeExperience;
    addEducation(userId: number, data: any): Promise<{
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
    updateEducation(userId: number, id: number, data: any): Promise<{
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
    removeEducation(userId: number, id: number): Promise<{
        message: string;
    }>;
    private ownEducation;
    private normalizeEducation;
    addCertification(userId: number, data: any): Promise<{
        certificate_file?: string;
        id: number;
        certification_name: string;
        issuing_institution: string;
        certification_date: Date;
        expiry_date: Date;
        credential_id: string;
        credential_url: string;
    }>;
    updateCertification(userId: number, id: number, data: any): Promise<{
        certificate_file?: string;
        id: number;
        certification_name: string;
        issuing_institution: string;
        certification_date: Date;
        expiry_date: Date;
        credential_id: string;
        credential_url: string;
    }>;
    removeCertification(userId: number, id: number): Promise<{
        message: string;
    }>;
    private ownCertification;
    private normalizeCertification;
    addLanguage(userId: number, data: any): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }>;
    updateLanguage(userId: number, id: number, data: any): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }>;
    removeLanguage(userId: number, id: number): Promise<{
        message: string;
    }>;
    listMyLanguages(userId: number): Promise<{
        id: number;
        language_name: string;
        proficiency: "basic" | "conversational" | "fluent" | "native";
    }[]>;
    private ownLanguage;
    private cleanLanguageName;
}
