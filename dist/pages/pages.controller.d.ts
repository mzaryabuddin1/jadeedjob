import { PagesService } from './pages.service';
export declare class PagesController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    createPage(body: any, req: any): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./pages.schema").Page, {}> & import("./pages.schema").Page & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    getPages(query: any, req: any): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("./pages.schema").Page, {}> & import("./pages.schema").Page & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            totalPages: number;
            currentPage: number;
            limit: number;
        };
    }>;
    getPageById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./pages.schema").Page, {}> & import("./pages.schema").Page & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    updatePage(id: string, body: any, req: any): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./pages.schema").Page, {}> & import("./pages.schema").Page & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    deletePage(id: string, req: any): Promise<{
        message: string;
    }>;
}
