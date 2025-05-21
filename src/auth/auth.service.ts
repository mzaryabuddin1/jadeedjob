import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/user.schema';
import { pbkdf2Sync, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  generateToken(user: User) {
    return this.jwtService.sign({ id: user._id });
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

  async findUserByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone });
  }

  hashPassword(password: string): { salt: string; hash: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  validatePassword(password: string, storedHash: string, salt: string): boolean {
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
  }

  async validateUser(phone: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ phone }).populate('country').populate('language');
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) throw new UnauthorizedException('Invalid phone or password');

    if (user.isBanned) throw new UnauthorizedException('Your account is blocked!');

    return user;
  }
  
}
