import { OrganizationService } from './organization.service';
export declare class OrganizationController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    create(body: any, req: any): Promise<import("./entities/organization.entity").Organization>;
    addMember(body: any, req: any): Promise<import("./entities/organization.entity").Organization>;
    getMine(req: any): Promise<import("./entities/organization.entity").Organization[]>;
}
