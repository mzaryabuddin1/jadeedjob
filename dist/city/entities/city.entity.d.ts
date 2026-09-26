import { Country } from 'src/country/entities/country.entity';
import { User } from 'src/users/entities/user.entity';
export declare class City {
    id: number;
    name: string;
    country: Country;
    countryId: number;
    users: User[];
}
