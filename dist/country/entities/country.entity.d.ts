import { User } from 'src/users/entities/user.entity';
export declare class Country {
    id: number;
    name: string;
    code: string;
    dial_code: string;
    users: User[];
}
