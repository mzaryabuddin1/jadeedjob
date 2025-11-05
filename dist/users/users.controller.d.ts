import { UsersService } from './users.service';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    constructor(usersService: UsersService, authService: AuthService);
    updateMe(req: Request, body: any): Promise<{
        message: string;
        user: import("./user.schema").User;
    }>;
}
