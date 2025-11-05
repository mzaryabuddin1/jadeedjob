import { Document, Types } from 'mongoose';
export declare class Job extends Document {
    filter: Types.ObjectId;
    description: string;
    skill_requirements: string[];
    benefits: string[];
    shifts: string[];
    jobTypes: string[];
    salaryType: string;
    salaryAmount: number;
    currency: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    startDate?: Date;
    endDate?: Date;
    industry?: string;
    educationLevel?: string;
    experienceRequired?: string;
    languageRequirements?: string[];
    isActive: boolean;
}
export declare const JobSchema: import("mongoose").Schema<Job, import("mongoose").Model<Job, any, any, any, Document<unknown, any, Job, any> & Job & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Job, Document<unknown, {}, import("mongoose").FlatRecord<Job>, {}> & import("mongoose").FlatRecord<Job> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
