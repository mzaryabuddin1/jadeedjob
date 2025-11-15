import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        country: true,
        language: true,
        work_experience: true,
        education: true,
        certifications: true,
        filters: true,
      },
    });
  }

  async updateUser(id: number, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        country: true,
        language: true,
        work_experience: true,
        education: true,
        certifications: true,
        filters: true,
      },
    });
  }
}

