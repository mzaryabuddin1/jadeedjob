import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobApplicationService {
  constructor(private prisma: PrismaService) {}

  async apply(data: { jobId: number; applicantId: number }) {
    // Check if job exists and is active
    const job = await this.prisma.job.findFirst({
      where: { id: data.jobId, isActive: true },
    });

    if (!job) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    // Prevent duplicate application
    const existing = await this.prisma.jobApplication.findFirst({
      where: {
        jobId: data.jobId,
        applicantId: data.applicantId,
      },
    });

    if (existing) {
      throw new BadRequestException('You already applied to this job');
    }

    return this.prisma.jobApplication.create({
      data,
    });
  }

    async getApplicationsByUser(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: { applicantId: userId },
        include: { job: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobApplication.count({
        where: { applicantId: userId },
      }),
    ]);

    return {
      data: applications,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

    async getApplicationsByJob(jobId: number) {
    return this.prisma.jobApplication.findMany({
      where: { jobId },
      include: { applicant: true },
    });
  }

    async updateStatus(id: number, status: string) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: { status },
    });
  }
}
