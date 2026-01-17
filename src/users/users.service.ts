import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateUser(id: number, data: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);

    return this.userRepo.save(user);
  }

  async findUsersByIds(ids: number[]) {
    return this.userRepo.find({
      where: { id: In(ids) },
    });
  }

  async getUserPreference(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    return { data: user.filter_preferences ?? [] };
  }

  async updateUserFilterPreferences(userId: number, newFilters: number[]) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'filter_preferences', 'fcmTokens'],
    });

    if (!user) return;

    const oldFilters = user.filter_preferences || [];

    // update in DB
    user.filter_preferences = newFilters;
    await this.userRepo.save(user);

    // sync Firebase topics for all user's tokens
    for (const token of user.fcmTokens || []) {
      await this.firebaseService.updateFilterSubscriptions(
        token,
        oldFilters,
        newFilters,
      );
    }
  }
}
