import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
export declare class LanguageService {
    private readonly languageRepo;
    constructor(languageRepo: Repository<Language>);
    findAll(): Promise<Language[]>;
    findOne(id: number): Promise<Language>;
    create(data: {
        code: string;
        name: string;
    }): Promise<Language>;
    update(id: number, data: any): Promise<Language>;
    delete(id: number): Promise<Language>;
}
