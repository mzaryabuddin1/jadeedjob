import { Country } from './country.schema';
import { Model } from 'mongoose';
export declare class CountryService {
    private readonly countryModel;
    constructor(countryModel: Model<Country>);
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
    getCountryById(id: string): Promise<Country>;
}
