import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}

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
