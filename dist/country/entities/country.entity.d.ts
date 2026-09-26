import { User } from 'src/users/entities/user.entity';
import { City } from 'src/city/entities/city.entity';
export declare class Country {
    id: number;
    name: string;
    code: string;
    dial_code: string;
    users: User[];
    cities: City[];
}
