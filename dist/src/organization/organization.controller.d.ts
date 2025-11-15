import { OrganizationService } from './organization.service';
export declare class OrganizationController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    create(body: any, req: any): Promise<any>;
    addMember(body: any, req: any): Promise<{
        message: string;
        organization: any;
    }>;
    getMine(req: any): Promise<any>;
}
