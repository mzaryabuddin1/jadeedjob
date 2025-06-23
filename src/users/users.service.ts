import { Injectable } from '@nestjs/common';
import { User } from './user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
    constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    ) {}

    async getUserById(id: string): Promise<User | null> {
        return await this.userModel.findById(id).populate('country').populate('language').exec();
    }

    async findUsersByIds(userIds: any): Promise<any[]> {
        return this.userModel.find({ _id: { $in: userIds } });
    }
    
}
