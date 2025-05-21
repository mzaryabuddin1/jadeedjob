import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Filter extends Document {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, default:'fas fa-user-tie' }) icon: string; // FontAwesome class
  @Prop({ enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' }) approvalStatus: string;
  @Prop() rejectionReason?: string;
  @Prop({ type: Types.ObjectId, ref: 'User' }) createdBy: Types.ObjectId;
}

export const FilterSchema = SchemaFactory.createForClass(Filter);
