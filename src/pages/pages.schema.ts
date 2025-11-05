import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Page extends Document {
  // 🔹 Ownership
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  // 🔹 Basic Information
  @Prop({ required: true }) company_name: string;
  @Prop() business_name: string;
  @Prop() company_logo: string;
  @Prop() website_url: string;
  @Prop() official_email: string;
  @Prop() official_phone: string;
  @Prop() industry_type: string;
  @Prop() company_description: string;
  @Prop() founded_year: number;

  // 🔹 Address & Location
  @Prop() country: string;
  @Prop() state: string;
  @Prop() city: string;
  @Prop() postal_code: string;
  @Prop() address_line1: string;
  @Prop() address_line2: string;
  @Prop() google_maps_link: string;

  // 🔹 Legal & Registration
  @Prop() business_registration_number: string;
  @Prop() tax_identification_number: string;
  @Prop() registration_authority: string;
  @Prop() business_license_document: string;
  @Prop() company_type: string;
  @Prop({ default: 'pending' })
  verification_status: 'pending' | 'verified' | 'rejected';
  @Prop() verification_date: Date;

  // 🔹 Representative Info
  @Prop() representative_name: string;
  @Prop() representative_designation: string;
  @Prop() representative_email: string;
  @Prop() representative_phone: string;
  @Prop() id_proof_document: string;

  // 🔹 Digital Presence
  @Prop() linkedin_page_url: string;
  @Prop() facebook_page_url: string;
  @Prop() instagram_page_url: string;
  @Prop() twitter_page_url: string;
  @Prop() youtube_channel_url: string;
  @Prop() verified_email_domain: string;

  // 🔹 Internal Verification
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  verified_by_admin_id?: Types.ObjectId;
  @Prop() verification_notes: string;
  @Prop({ type: [String], default: [] })
  verification_documents: string[];
  @Prop() rejection_reason: string;

  // 🔹 Optional Trust Metrics
  @Prop() number_of_employees?: number;
  @Prop() annual_revenue_range?: string;
  @Prop({ type: [String], default: [] }) client_list?: string[];
  @Prop({ type: [String], default: [] }) certifications?: string[];
  @Prop() company_rating?: number;
}

export const PageSchema = SchemaFactory.createForClass(Page);
