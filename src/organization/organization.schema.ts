import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false }) 
export class OrgMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['owner', 'admin', 'user'], default: 'user' })
  role: 'owner' | 'admin' | 'user';
}

@Schema({ timestamps: true })
export class Organization extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  industry: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' }) isActive: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [OrgMember], default: [] })
  members: OrgMember[];
}

export const OrgMemberSchema = SchemaFactory.createForClass(OrgMember);
export const OrganizationSchema = SchemaFactory.createForClass(Organization);
