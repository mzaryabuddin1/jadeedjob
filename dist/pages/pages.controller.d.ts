import { PagesService } from './pages.service';
export declare class PagesController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    createPage(body: any, req: any): Promise<{
        message: string;
        data: import("./entities/page.entity").Page[];
    }>;
    getPages(query: any, req: any): Promise<{
        data: import("./entities/page.entity").Page[];
        pagination: {
            total: number;
            totalPages: number;
            currentPage: number;
            limit: number;
        };
    }>;
    getPageById(id: string): Promise<import("./entities/page.entity").Page>;
    updatePage(id: string, body: any, req: any): Promise<{
        message: string;
        data: import("./entities/page.entity").Page;
    }>;
    deletePage(id: string, req: any): Promise<{
        message: string;
    }>;
}
