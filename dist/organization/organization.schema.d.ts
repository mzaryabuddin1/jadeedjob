import { Document, Types } from 'mongoose';
export declare class OrgMember {
    user: Types.ObjectId;
    role: 'owner' | 'admin' | 'user';
}
export declare class Organization extends Document {
    name: string;
    industry: string;
    isActive: string;
    createdBy: Types.ObjectId;
    members: OrgMember[];
}
export declare const OrgMemberSchema: import("mongoose").Schema<OrgMember, import("mongoose").Model<OrgMember, any, any, any, Document<unknown, any, OrgMember, any> & OrgMember & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrgMember, Document<unknown, {}, import("mongoose").FlatRecord<OrgMember>, {}> & import("mongoose").FlatRecord<OrgMember> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const OrganizationSchema: import("mongoose").Schema<Organization, import("mongoose").Model<Organization, any, any, any, Document<unknown, any, Organization, any> & Organization & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Organization, Document<unknown, {}, import("mongoose").FlatRecord<Organization>, {}> & import("mongoose").FlatRecord<Organization> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
