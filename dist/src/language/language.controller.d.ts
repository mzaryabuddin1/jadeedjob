import { LanguageService } from './language.service';
export declare class LanguageController {
    private readonly languageService;
    constructor(languageService: LanguageService);
    findAll(): any;
    findOne(id: string): any;
    create(body: any): any;
    update(id: string, body: any): any;
    remove(id: string): any;
}
