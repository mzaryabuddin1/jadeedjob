import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobApplication } from './job-application.schema';
import { Job } from 'src/job/job.schema';

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectModel(JobApplication.name)
    private jobAppModel: Model<JobApplication>,
    @InjectModel(Job.name) private jobModel: Model<Job>, // ✅ THIS LINE
  ) {}

  async apply(data: any) {
    // ✅ Check if job exists and is active
    const job = await this.jobModel.findOne({ _id: data.job, isActive: true });
    if (!job) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    // Optionally, prevent duplicate applications
    const existing = await this.jobAppModel.findOne({
      job: data.job,
      applicant: data.applicant,
    });
    if (existing) {
      throw new BadRequestException('You already applied to this job');
    }

    const application = new this.jobAppModel(data);
    return application.save();
  }

  async getApplicationsByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 50);

    const [applications, total] = await Promise.all([
      this.jobAppModel
        .find({ applicant: userId })
        .populate('job')
        .skip(skip)
        .limit(maxLimit),
      this.jobAppModel.countDocuments({ applicant: userId }),
    ]);

    const totalPages = Math.ceil(total / maxLimit);

    return {
      data: applications,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async getApplicationsByJob(jobId: string) {
    return this.jobAppModel.find({ job: jobId }).populate('applicant');
  }

  async updateStatus(id: string, status: string) {
    return this.jobAppModel.findByIdAndUpdate(id, { status }, { new: true });
  }
}
