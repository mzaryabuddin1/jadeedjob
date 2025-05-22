import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Job extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Filter', required: true })
  filter: Types.ObjectId;

  @Prop()
  description: string;

  @Prop({type: [String], default: []})
  skill_requirements: string[];

  @Prop({type: [String], default: []})
  benefits: string[];

  @Prop({ type: [String], enum: ['morning', 'evening', 'night', 'rotational'], default: [] })
  shifts: string[];

  @Prop({ type: [String], enum: ['full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship'], default: [] })
  jobTypes: string[];

  @Prop({
    type: String,
    enum: ['piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable'],
    required: true,
  })
  salaryType: string;

  @Prop({ type: Number, required: true })
  salaryAmount: number;

  @Prop({ required: false })
  currency: string;

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    required: true,
  })
  location: {
    lat: number;
    lng: number;
  };

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ required: false })
  industry?: string;

  @Prop({ required: false })
  educationLevel?: string;

  @Prop({ required: false })
  experienceRequired?: string;

  @Prop({ required: false })
  languageRequirements?: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const JobSchema = SchemaFactory.createForClass(Job);
