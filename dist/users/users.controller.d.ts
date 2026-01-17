import { UsersService } from './users.service';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    private firebaseService;
    constructor(usersService: UsersService, authService: AuthService, firebaseService: FirebaseService);
    updateMe(req: Request, body: any): Promise<{
        message: string;
        user: import("./entities/user.entity").User;
    }>;
    getMyPreferences(req: any): Promise<{
        data: number[];
    }>;
}
