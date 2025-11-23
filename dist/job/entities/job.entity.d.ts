import { Filter } from 'src/filter/entities/filter.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
export declare class Job {
    id: number;
    filter: Filter;
    filterId: number;
    description: string;
    requirements: string;
    benefits: string[];
    shifts: string[];
    jobTypes: string[];
    salaryType: string;
    salaryAmount: number;
    currency: string;
    location: string;
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
}
