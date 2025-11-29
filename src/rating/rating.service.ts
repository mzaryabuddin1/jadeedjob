import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,

    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async rateUser(
    raterId: number,
    jobApplicationId: number,
    stars: number,
    comment: string,
  ) {
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('Stars must be between 1 and 5');
    }

    const app = await this.appRepo.findOne({
      where: { id: jobApplicationId },
      relations: ['job', 'applicant', 'job.creator'],
    });

    if (!app) throw new NotFoundException('Job application not found');
    if (app.status !== 'accepted')
      throw new BadRequestException('Rating allowed only after acceptance');

    // Determine who is rating who
    let targetUserId: number;

    if (raterId === app.applicantId) {
      // Applicant rating job creator
      targetUserId = app.job.createdBy;
    } else if (raterId === app.job.createdBy) {
      // Job creator rating applicant
      targetUserId = app.applicantId;
    } else {
      throw new BadRequestException('You cannot rate this application');
    }

    // Check duplicate rating
    const exists = await this.ratingRepo.findOne({
      where: { jobApplicationId, givenBy: raterId },
    });

    if (exists) throw new BadRequestException('You already rated for this job');

    // Save rating
    const rating = this.ratingRepo.create({
      jobApplicationId,
      givenBy: raterId,
      givenTo: targetUserId,
      stars,
      comment,
    });

    await this.ratingRepo.save(rating);

    // Update the rated user's average & count
    await this.updateUserRatingStats(targetUserId);

    return { message: 'Rating submitted', rating };
  }

  async updateUserRatingStats(userId: number) {
    const ratings = await this.ratingRepo.find({
      where: { givenTo: userId },
    });

    const total = ratings.length;
    const avg =
      total > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / total : 0;

    await this.userRepo.update(userId, {
      ratingAverage: avg,
      ratingCount: total,
    });
  }
}
