import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
export declare class UsersService {
    private readonly userRepo;
    private firebaseService;
    constructor(userRepo: Repository<User>, firebaseService: FirebaseService);
    getUserById(id: number): Promise<User>;
    updateUser(id: number, data: any): Promise<User>;
    findUsersByIds(ids: number[]): Promise<User[]>;
    getUserPreference(userId: number): Promise<{
        data: number[];
    }>;
    updateUserFilterPreferences(userId: number, newFilters: number[]): Promise<void>;
}
