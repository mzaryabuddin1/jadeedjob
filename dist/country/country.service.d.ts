import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
export declare class CountryService {
    private countryRepo;
    constructor(countryRepo: Repository<Country>);
    getAllCountries(options: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: 'name' | 'dialCode' | 'alpha2' | 'region';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        data: Country[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(id: number): Promise<Country>;
}
