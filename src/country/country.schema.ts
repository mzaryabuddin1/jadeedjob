import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Country extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  unicode: string;

  @Prop()
  emoji: string;

  @Prop({ required: true })
  alpha2: string;

  @Prop({ required: true })
  alpha3: string;

  @Prop({ required: true })
  dialCode: string;

  @Prop()
  region: string;

  @Prop()
  capital: string;

  @Prop({
    type: {
      lat: Number,
      long: Number,
    },
  })
  geo: {
    lat: number;
    long: number;
  };

  @Prop()
  currency_code: string;

  @Prop()
  currency_name: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop([String])
  timezones: string[];
}

export const CountrySchema = SchemaFactory.createForClass(Country);
