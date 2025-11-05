import { Document, Types } from 'mongoose';
export declare class JobApplication extends Document {
    job: Types.ObjectId;
    applicant: Types.ObjectId;
    status: string;
}
export declare const JobApplicationSchema: import("mongoose").Schema<JobApplication, import("mongoose").Model<JobApplication, any, any, any, Document<unknown, any, JobApplication, any> & JobApplication & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, JobApplication, Document<unknown, {}, import("mongoose").FlatRecord<JobApplication>, {}> & import("mongoose").FlatRecord<JobApplication> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
