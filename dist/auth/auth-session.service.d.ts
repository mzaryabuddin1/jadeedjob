import { JwtPayload } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
export type AuthenticatedUserPayload = JwtPayload & {
    id: number;
};
export declare class AuthSessionService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    getBearerToken(authHeader: string | string[] | undefined): string;
    validateAuthorizationHeader(authHeader: string | string[] | undefined): Promise<AuthenticatedUserPayload>;
    validateToken(token: string): Promise<AuthenticatedUserPayload>;
}
