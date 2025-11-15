import { PrismaService } from 'src/prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserById(id: number): Promise<any>;
    updateUser(id: number, data: any): Promise<any>;
}
