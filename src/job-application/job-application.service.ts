import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectRepository(JobApplication)
    private jobAppRepo: Repository<JobApplication>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async apply(data: { jobId: number; applicantId: number }) {
    const job = await this.jobRepo.findOne({
      where: { id: data.jobId, isActive: true },
    });

    if (!job) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    const existing = await this.jobAppRepo.findOne({
      where: {
        jobId: data.jobId,
        applicantId: data.applicantId,
      },
    });

    if (existing) {
      throw new BadRequestException('You already applied to this job');
    }

    const app = this.jobAppRepo.create({
      jobId: data.jobId,
      applicantId: data.applicantId,
    });

    return this.jobAppRepo.save(app);
  }

  async getApplicationsByUser(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await this.jobAppRepo.findAndCount({
      where: { applicantId: userId },
      relations: ['job'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: applications,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getApplicationsByJob(jobId: number) {
    return this.jobAppRepo.find({
      where: { jobId },
      relations: ['applicant'],
    });
  }

  async updateStatus(id: number, status: string) {
    const app = await this.jobAppRepo.findOne({ where: { id } });

    if (!app) {
      throw new BadRequestException('Application not found');
    }

    app.status = status;
    return this.jobAppRepo.save(app);
  }
}
