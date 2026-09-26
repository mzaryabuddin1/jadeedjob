import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { SEED_LANGUAGES } from './seed-languages.data';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}

  /**
   * Populate languages (CLI: npm run seed:languages).
   * Skips rows that already exist by code or name.
   */
  async seedLanguages(): Promise<{ created: Language[]; skipped: string[] }> {
    const created: Language[] = [];
    const skipped: string[] = [];

    for (const item of SEED_LANGUAGES) {
      const existing = await this.languageRepo.findOne({
        where: [{ code: item.code }, { name: item.name }],
      });

      if (existing) {
        skipped.push(item.name);
        continue;
      }

      const language = await this.languageRepo.save(
        this.languageRepo.create({
          code: item.code,
          name: item.name,
        }),
      );

      created.push(language);
    }

    return { created, skipped };
  }

  findAll() {
    return this.languageRepo.find();
  }

  async findOne(id: number) {
    const lang = await this.languageRepo.findOne({ where: { id } });
    if (!lang) {
      throw new NotFoundException('Language not found');
    }
    return lang;
  }

  create(data: { code: string; name: string }) {
    const lang = this.languageRepo.create(data);
    return this.languageRepo.save(lang);
  }

  async update(id: number, data: any) {
    const lang = await this.findOne(id);
    Object.assign(lang, data);
    return this.languageRepo.save(lang);
  }

  async delete(id: number) {
    const lang = await this.findOne(id);
    return this.languageRepo.remove(lang);
  }
}
