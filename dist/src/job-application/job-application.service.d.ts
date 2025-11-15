import { PrismaService } from 'src/prisma/prisma.service';
export declare class JobApplicationService {
    private prisma;
    constructor(prisma: PrismaService);
    apply(data: {
        jobId: number;
        applicantId: number;
    }): Promise<any>;
    getApplicationsByUser(userId: number, page?: number, limit?: number): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    getApplicationsByJob(jobId: number): Promise<any>;
    updateStatus(id: number, status: string): Promise<any>;
}
