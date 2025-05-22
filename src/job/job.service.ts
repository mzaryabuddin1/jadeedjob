import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from './job.schema';
import { Model } from 'mongoose';

@Injectable()
export class JobService {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<Job>) {}

  async createJob(payload: any): Promise<Job> {
    const job = new this.jobModel(payload);
    return job.save();
  }
}
