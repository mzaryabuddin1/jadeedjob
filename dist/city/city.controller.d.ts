import { CityService } from './city.service';
export declare class CityController {
    private readonly cityService;
    constructor(cityService: CityService);
    getCities(query: any): Promise<{
        data: import("./entities/city.entity").City[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCityById(id: string): Promise<import("./entities/city.entity").City>;
}
