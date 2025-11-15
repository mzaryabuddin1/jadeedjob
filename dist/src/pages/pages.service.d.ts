import { PrismaService } from 'src/prisma/prisma.service';
export declare class PagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: any;
    }>;
    getPages(query: any, userId?: number): Promise<{
        data: any;
        pagination: {
            total: any;
            totalPages: number;
            currentPage: number;
            limit: number;
        };
    }>;
    getPageById(id: number): Promise<any>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: any;
    }>;
    deletePage(id: number, userId: number): Promise<{
        message: string;
    }>;
}
