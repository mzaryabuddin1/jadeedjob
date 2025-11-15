import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { pbkdf2Sync, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  generateToken(user: any) {
    return this.jwtService.sign({ id: user.id });
  }

  async createOrGetUser(data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) return existingUser;

    return this.prisma.user.create({
      data: {
        ...data,
        countryId: Number(data.country),
        languageId: Number(data.language),
        isBanned: false,
      },
    });
  }

  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      include: {
        country: true,
        language: true,
      },
    });
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  validatePassword(password: string, storedHash: string, salt: string) {
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
  }

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        country: true,
        language: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid phone or password');

    const isValid = this.validatePassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) throw new UnauthorizedException('Invalid phone or password');

    if (user.isBanned) throw new UnauthorizedException('Your account is blocked!');

    return user;
  }
}
