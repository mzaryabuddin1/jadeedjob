import { PrismaService } from 'src/prisma/prisma.service';
export declare class LanguageService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): any;
    findOne(id: number): any;
    create(data: {
        code: string;
        name: string;
    }): any;
    update(id: number, data: any): any;
    delete(id: number): any;
}
