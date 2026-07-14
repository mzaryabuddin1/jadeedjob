import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

export type AuthenticatedUserPayload = JwtPayload & {
  id: number;
};

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  getBearerToken(authHeader: string | string[] | undefined): string {
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    return token;
  }

  async validateAuthorizationHeader(
    authHeader: string | string[] | undefined,
  ): Promise<AuthenticatedUserPayload> {
    return this.validateToken(this.getBearerToken(authHeader));
  }

  async validateToken(token: string): Promise<AuthenticatedUserPayload> {
    let decoded: string | JwtPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (typeof decoded === 'string') {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const id = Number(decoded.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'isBanned', 'tokenVersion'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user session');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account is blocked!');
    }

    const tokenVersion = Number((decoded as any).tokenVersion ?? 0);
    if (tokenVersion !== Number(user.tokenVersion || 0)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      ...decoded,
      id,
    };
  }
}
