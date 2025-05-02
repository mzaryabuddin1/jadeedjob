import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  generateToken(user: User) {
    return this.jwtService.sign({ sub: user._id, isBanned: user.isBanned });
  }

  async createOrGetUser(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    countryId: string;
    languageId: string;
    isVerified?: boolean;
  }): Promise<User> {
    const existingUser = await this.userModel.findOne({ phone: data.phone });

    if (existingUser) {
      return existingUser;
    }

    const newUser = new this.userModel({
      ...data,
      country: data.countryId,
      language: data.languageId,
      isBanned: false,
    });

    return await newUser.save();
  }
}
