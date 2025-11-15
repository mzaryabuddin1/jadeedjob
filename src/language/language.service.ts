import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LanguageService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.language.findMany();
  }

  findOne(id: number) {
    return this.prisma.language.findUnique({ where: { id } });
  }

  create(data: { code: string; name: string }) {
    return this.prisma.language.create({ data });
  }

  update(id: number, data: any) {
    return this.prisma.language.update({
      where: { id },
      data,
    });
  }

  delete(id: number) {
    return this.prisma.language.delete({ where: { id } });
  }
}
