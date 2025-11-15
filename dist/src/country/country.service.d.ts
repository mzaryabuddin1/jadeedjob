import { PrismaService } from 'src/prisma/prisma.service';
export declare class CountryService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllCountries(options: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: 'name' | 'dialCode' | 'alpha2' | 'region';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(id: string): Promise<any>;
}
