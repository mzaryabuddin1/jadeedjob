import { Filter } from 'src/filter/entities/filter.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
export declare class Job {
    id: number;
    filters: Filter[];
    title: string;
    description: string | null;
    pictures: string[] | null;
    isRemote: boolean;
    requirements: string;
    benefits: string[];
    shifts: string[];
    jobTypes: string[];
    salaryType: string;
    salaryAmount: number;
    currency: string;
    location: {
        lat: number;
        lng: number;
    };
    startDate: Date;
    endDate: Date;
    industry: string;
    educationLevel: string;
    experienceRequired: string;
    languageRequirements: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: number;
    creator: User;
    applications: JobApplication[];
    pageId?: number;
    page?: Page;
}
