import { CountryService } from './country.service';
export declare class CountryController {
    private readonly countryService;
    constructor(countryService: CountryService);
    getAllCountries(query: any): Promise<{
        data: import("./country.schema").Country[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(params: any): Promise<import("./country.schema").Country>;
}
