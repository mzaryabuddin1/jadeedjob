import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Country } from './country.schema';
import countriesData from './countries.json'; // Place your JSON here

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(Country.name) private countryModel: Model<Country>,
  ) {}

  async insertCountries(): Promise<void> {
    const count = await this.countryModel.countDocuments();
    if (count === 0) {
      await this.countryModel.insertMany(countriesData);
      console.log('Countries inserted successfully!');
    } else {
      console.log('Countries already exist in the database.');
    }
  }
}
