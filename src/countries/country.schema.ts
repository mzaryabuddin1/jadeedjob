import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Country extends Document {
  @Prop() name: string;
  @Prop() unicode: string;
  @Prop() emoji: string;
  @Prop() alpha2: string;
  @Prop() dialCode: string;
  @Prop() alpha3: string;
  @Prop() region: string;
  @Prop() capital: string;
  @Prop({ type: Object }) geo: { lat: number; long: number };
  @Prop([String]) timezones: string[];
}

export const CountrySchema = SchemaFactory.createForClass(Country);
