import { CountryService } from './country.service';
export declare class CountryController {
    private readonly countryService;
    constructor(countryService: CountryService);
    getAllCountries(query: any): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(params: any): Promise<any>;
}
