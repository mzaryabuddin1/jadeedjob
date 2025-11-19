import { CountryService } from './country.service';
export declare class CountryController {
    private readonly countryService;
    constructor(countryService: CountryService);
    getAllCountries(query: any): Promise<{
        data: import("./entities/country.entity").Country[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(params: any): Promise<import("./entities/country.entity").Country>;
}
