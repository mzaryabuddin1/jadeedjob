import { PagesService } from 'src/pages/pages.service';
export declare class ProfilePublisherOptionsController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    getPublisherOptions(query: any, req: any): Promise<{
        data: ({
            disabledReason?: string;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        } | {
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        })[];
    }>;
}
