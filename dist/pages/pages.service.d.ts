import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
export declare class PagesService {
    private readonly pageRepo;
    constructor(pageRepo: Repository<Page>);
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: Page[];
    }>;
    getPages(query: any, userId?: number): Promise<{
        data: Page[];
        pagination: {
            total: number;
            totalPages: number;
            currentPage: number;
            limit: number;
        };
    }>;
    getPageById(id: number): Promise<Page>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: Page;
    }>;
    deletePage(id: number, userId: number): Promise<{
        message: string;
    }>;
}
