import { UsersService } from './users.service';
export declare class AdminUserController {
    private readonly usersService;
    constructor(usersService: UsersService);
    setBan(id: number, req: any, body: {
        banned: boolean;
        reason?: string;
    }): Promise<{
        message: string;
        user: {
            id: number;
            isBanned: boolean;
        };
    }>;
}
