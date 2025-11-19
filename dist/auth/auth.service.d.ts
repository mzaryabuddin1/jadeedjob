import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'twilio/lib/twiml/VoiceResponse';
export declare class AuthService {
    private jwtService;
    private userRepo;
    private countryRepo;
    private languageRepo;
    constructor(jwtService: JwtService, userRepo: Repository<User>, countryRepo: Repository<Country>, languageRepo: Repository<Language>);
    generateToken(user: any): string;
    findUserByPhone(phone: string): Promise<User>;
    createOrGetUser(data: any): Promise<User | User[]>;
    hashPassword(password: string): {
        salt: string;
        hash: string;
    };
    validatePassword(password: string, storedHash: string, salt: string): boolean;
    validateUser(phone: string, password: string): Promise<User>;
    resetPassword(phone: string, salt: string, hash: string): Promise<void>;
}
