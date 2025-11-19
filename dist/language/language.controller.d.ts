import { LanguageService } from './language.service';
export declare class LanguageController {
    private readonly languageService;
    constructor(languageService: LanguageService);
    findAll(): Promise<import("./entities/language.entity").Language[]>;
    findOne(id: string): Promise<import("./entities/language.entity").Language>;
    create(body: any): Promise<import("./entities/language.entity").Language>;
    update(id: string, body: any): Promise<import("./entities/language.entity").Language>;
    remove(id: string): Promise<import("./entities/language.entity").Language>;
}
