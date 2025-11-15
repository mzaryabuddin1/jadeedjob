import { PrismaService } from 'src/prisma/prisma.service';
export declare class FilterService {
    private prisma;
    constructor(prisma: PrismaService);
    createFilter(data: any): Promise<any>;
    getFilters(query: any): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    filterById(id: number): Promise<any>;
}
