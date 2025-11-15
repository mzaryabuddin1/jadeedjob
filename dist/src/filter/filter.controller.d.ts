import { FilterService } from './filter.service';
import { PrismaService } from 'src/prisma/prisma.service';
export declare class FilterController {
    private readonly filterService;
    private readonly prisma;
    constructor(filterService: FilterService, prisma: PrismaService);
    createFilter(body: any, req: any): Promise<{
        message: string;
        filter: any;
    }>;
    getFilter(query: any): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(params: any): Promise<any>;
}
