import { Model } from 'mongoose';
import { Page } from './pages.schema';
export declare class PagesService {
    private readonly pageModel;
    constructor(pageModel: Model<Page>);
    createPage(data: any, userId: string): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, Page, {}> & Page & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    getPages(query: any, userId?: string): Promise<{
        data: (import("mongoose").Document<unknown, {}, Page, {}> & Page & Required<{
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
    getPageById(id: string): Promise<import("mongoose").Document<unknown, {}, Page, {}> & Page & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    updatePage(id: string, data: any, userId: string): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, Page, {}> & Page & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    deletePage(id: string, userId: string): Promise<{
        message: string;
    }>;
}
