import { PagesService } from './pages.service';
export declare class PagesController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    createPage(body: any, req: any): Promise<{
        message: string;
        data: any;
    }>;
    getPages(query: any, req: any): Promise<{
        data: any;
        pagination: {
            total: any;
            totalPages: number;
            currentPage: number;
            limit: number;
        };
    }>;
    getPageById(id: string): Promise<any>;
    updatePage(id: string, body: any, req: any): Promise<{
        message: string;
        data: any;
    }>;
    deletePage(id: string, req: any): Promise<{
        message: string;
    }>;
}
