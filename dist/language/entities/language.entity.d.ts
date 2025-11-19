import { User } from 'src/users/entities/user.entity';
export declare class Language {
    id: number;
    code: string;
    name: string;
    users: User[];
}
