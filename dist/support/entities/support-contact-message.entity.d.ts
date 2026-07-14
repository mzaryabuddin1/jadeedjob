import { User } from 'src/users/entities/user.entity';
export declare class SupportContactMessage {
    id: number;
    userId: number;
    user: User;
    name: string;
    phone: string;
    subject: string;
    message: string;
    source: string;
    status: string;
    createdAt: Date;
}
