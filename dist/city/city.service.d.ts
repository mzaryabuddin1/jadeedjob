import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Country } from 'src/country/entities/country.entity';
export declare class CityService {
    private cityRepo;
    private countryRepo;
    constructor(cityRepo: Repository<City>, countryRepo: Repository<Country>);
    getCities(options: {
        countryId?: number;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: City[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCityById(id: number): Promise<City>;
    seedPakistanCities(): Promise<{
        created: City[];
        skipped: string[];
        countryId: number;
    }>;
}
