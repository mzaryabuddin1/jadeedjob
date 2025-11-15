import { PrismaService } from 'src/prisma/prisma.service';
export declare class JobService {
    private prisma;
    constructor(prisma: PrismaService);
    createJob(data: any): Promise<any>;
    findNearbyJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJobs(query: any): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: any;
    }>;
}
