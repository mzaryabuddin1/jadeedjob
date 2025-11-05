import { Document, Types } from 'mongoose';
export declare class Filter extends Document {
    name: string;
    icon: string;
    status: string;
    approvalStatus: string;
    rejectionReason?: string;
    createdBy: Types.ObjectId;
}
export declare const FilterSchema: import("mongoose").Schema<Filter, import("mongoose").Model<Filter, any, any, any, Document<unknown, any, Filter, any> & Filter & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Filter, Document<unknown, {}, import("mongoose").FlatRecord<Filter>, {}> & import("mongoose").FlatRecord<Filter> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
