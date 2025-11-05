import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User } from 'src/users/user.schema';
export declare class AuthService {
    private jwtService;
    private userModel;
    constructor(jwtService: JwtService, userModel: Model<User>);
    generateToken(user: User): string;
    createOrGetUser(data: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        country: string;
        language: string;
        isVerified?: boolean;
    }): Promise<User>;
    findUserByPhone(phone: string): Promise<User | null>;
    hashPassword(password: string): {
        salt: string;
        hash: string;
    };
    validatePassword(password: string, storedHash: string, salt: string): boolean;
    validateUser(phone: string, password: string): Promise<User>;
}
