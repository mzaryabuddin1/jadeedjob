import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      relations: ['country', 'language', 'cityEntity'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateUser(id: number, data: any) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language', 'cityEntity'],
    });
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
    const unique = [...new Set(newFilters.map(Number))].filter(
      (n) => !Number.isNaN(n) && n > 0,
    );

    if (unique.length < 4) {
      throw new BadRequestException('Select at least 4 filter preferences');
    }
    if (unique.length > 30) {
      throw new BadRequestException(
        'You can select at most 30 filter preferences',
      );
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.filter_preferences', 'u.fcmTokens'])
      .where('u.id = :userId', { userId })
      .getOne();

    if (!user) return;

    const oldFilters = user.filter_preferences || [];

    // update in DB
    user.filter_preferences = unique;
    await this.userRepo.save(user);

    // sync Firebase topics for all user's tokens
    for (const token of user.fcmTokens || []) {
      await this.firebaseService.updateFilterSubscriptions(
        token,
        oldFilters,
        unique,
      );
    }

    return user;
  }
}
