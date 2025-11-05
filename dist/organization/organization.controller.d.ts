import { OrganizationService } from './organization.service';
export declare class OrganizationController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    create(body: any, req: any): Promise<import("mongoose").Document<unknown, {}, import("./organization.schema").Organization, {}> & import("./organization.schema").Organization & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    addMember(body: any, req: any): Promise<{
        message: string;
        organization: import("mongoose").Document<unknown, {}, import("./organization.schema").Organization, {}> & import("./organization.schema").Organization & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    getMine(req: any): Promise<(import("mongoose").Document<unknown, {}, import("./organization.schema").Organization, {}> & import("./organization.schema").Organization & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
