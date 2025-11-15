import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
export declare class AuthService {
    private jwtService;
    private prisma;
    constructor(jwtService: JwtService, prisma: PrismaService);
    generateToken(user: any): string;
    createOrGetUser(data: any): Promise<any>;
    findUserByPhone(phone: string): Promise<any>;
    hashPassword(password: string): {
        salt: string;
        hash: string;
    };
    validatePassword(password: string, storedHash: string, salt: string): boolean;
    validateUser(phone: string, password: string): Promise<any>;
}
