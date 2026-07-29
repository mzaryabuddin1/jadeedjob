import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { FilterService } from 'src/filter/filter.service';
import { PushService } from 'src/push/push.service';
export declare class AuthService {
    private jwtService;
    private userRepo;
    private countryRepo;
    private languageRepo;
    private filterService;
    private pushService;
    constructor(jwtService: JwtService, userRepo: Repository<User>, countryRepo: Repository<Country>, languageRepo: Repository<Language>, filterService: FilterService, pushService: PushService);
    generateToken(user: any): string;
    toPublicUser(user: any): any;
    generateUniqueReferralCode(): Promise<string>;
    findUserByPhone(phone: string): Promise<User>;
    createOrGetUser(data: any): Promise<User | User[]>;
    createSocialUser(data: {
        phone: string;
        firstName: string;
        lastName?: string;
        email?: string;
        profilePhoto?: string;
    }): Promise<User>;
    findUserById(userId: number): Promise<User>;
    validateRegistrationRelations(countryId: number, languageId: number): Promise<void>;
    hashPassword(password: string): {
        salt: string;
        hash: string;
    };
    validatePassword(password: string, storedHash: string, salt: string): boolean;
    validateUser(phone: string, password: string): Promise<User>;
    resetPassword(phone: string, salt: string, hash: string): Promise<User>;
    validateUserByIdAndPassword(userId: number, password: string): Promise<User>;
    changePassword(userId: number, newPassword: string): Promise<User>;
    changePhone(userId: number, newPhone: string): Promise<User>;
    incrementTokenVersion(userId: number): Promise<User>;
    attachFcmToken(userId: number, fcmToken: string, device?: {
        installationId?: string;
        platform?: 'ios' | 'android';
        appVersion?: string;
        locale?: string;
    }): Promise<void>;
}
