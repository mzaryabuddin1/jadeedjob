import { User } from './user.schema';
import { Model } from 'mongoose';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<User>);
    getUserById(id: string): Promise<User | null>;
    findUsersByIds(userIds: any): Promise<any[]>;
    updateUser(id: string, updateData: Partial<User>): Promise<User>;
}
