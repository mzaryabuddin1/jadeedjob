import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    return await this.userModel
      .findById(id)
      .populate('country')
      .populate('language')
      .exec();
  }

  async findUsersByIds(userIds: any): Promise<any[]> {
    return this.userModel.find({ _id: { $in: userIds } });
  }

  /**
   * Update an existing user by ID.
   * @param id - User's MongoDB ObjectId
   * @param updateData - Partial user data (fields to update)
   * @returns Updated user document
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('country')
      .populate('language')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updatedUser;
  }
}
