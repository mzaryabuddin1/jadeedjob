import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true }) firstName: string;
  @Prop({ required: true }) lastName: string;
  @Prop({ required: true }) password: string;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true }) country: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Language', required: true }) language: Types.ObjectId;

  @Prop() email?: string;

  @Prop({ required: true, unique: true }) phone: string;
  @Prop() isVerified: boolean;
  @Prop({ default: false }) isBanned: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
