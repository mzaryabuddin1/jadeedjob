import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

//
// ─── SUBSCHEMAS ─────────────────────────────────────────────
//

// Work Experience
@Schema()
export class WorkExperience {
  @Prop()
  company_name?: string;

  @Prop()
  designation?: string;

  @Prop()
  department?: string;

  @Prop({ enum: ['Full-time', 'Part-time', 'Contract'] })
  employment_type?: string;

  @Prop()
  from_date?: Date; // e.g., "Jan 2020 - Mar 2023"

  @Prop()
  to_date?: Date; // e.g., "Jan 2020 - Mar 2023"

  @Prop()
  key_responsibilities?: string;

  @Prop()
  experience_certificate?: string;

  @Prop({ default: false })
  currently_working?: boolean;
}
export const WorkExperienceSchema = SchemaFactory.createForClass(WorkExperience);

// Education
@Schema()
export class Education {
  @Prop()
  highest_qualification?: string;

  @Prop()
  institution_name?: string;

  @Prop()
  graduation_year?: string;

  @Prop()
  gpa_or_grade?: string;

  @Prop()
  degree_document?: string;
}
export const EducationSchema = SchemaFactory.createForClass(Education);

// Certification
@Schema()
export class Certification {
  @Prop()
  certification_name?: string;

  @Prop()
  issuing_institution?: string;

  @Prop()
  certification_date?: Date;

  @Prop()
  certificate_file?: string;
}
export const CertificationSchema = SchemaFactory.createForClass(Certification);

//
// ─── MAIN USER SCHEMA ─────────────────────────────────────────────
//

@Schema({ timestamps: true })
export class User extends Document {
  // Existing Fields
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  passwordSalt: string;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  country: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Language', required: true })
  language: Types.ObjectId;

  @Prop({ unique: true, required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isBanned: boolean;

  // Basic Details
  @Prop()
  full_name?: string;

  @Prop()
  father_name?: string;

  @Prop({ enum: ['Male', 'Female', 'Other'] })
  gender?: string;

  @Prop()
  date_of_birth?: Date;

  @Prop()
  nationality?: string;

  @Prop({ enum: ['Single', 'Married', 'Other'] })
  marital_status?: string;

  @Prop()
  profile_photo?: string;

  // Contact Info
  @Prop()
  alternate_phone?: string;

  @Prop()
  address_line1?: string;

  @Prop()
  address_line2?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postal_code?: string;

  @Prop()
  contact_country?: string;

  // Identity Verification
  @Prop()
  national_id_number?: string;

  @Prop()
  passport_number?: string;

  @Prop()
  id_expiry_date?: Date;

  @Prop()
  id_document_front?: string;

  @Prop()
  id_document_back?: string;

  @Prop()
  address_proof_document?: string;

  // Professional Summary
  @Prop()
  professional_summary?: string;

  // Work Experience (Multiple)
  @Prop({ type: [WorkExperienceSchema], default: [] })
  work_experience?: WorkExperience[];

  // Education (Multiple)
  @Prop({ type: [EducationSchema], default: [] })
  education?: Education[];

  // Certifications (Multiple)
  @Prop({ type: [CertificationSchema], default: [] })
  certifications?: Certification[];

  // Skills
  @Prop({ type: [String] })
  skills?: string[];

  @Prop({ type: [String] })
  technical_skills?: string[];

  @Prop({ type: [String] })
  soft_skills?: string[];

  // Social Profiles
  @Prop()
  linkedin_url?: string;

  @Prop()
  github_url?: string;

  @Prop()
  portfolio_url?: string;

  @Prop()
  behance_url?: string;

  // Bank Info (Optional)
  @Prop()
  bank_name?: string;

  @Prop()
  account_number?: string;

  @Prop()
  iban?: string;

  @Prop()
  branch_name?: string;

  @Prop()
  swift_code?: string;

  // Verification
  @Prop({ enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  kyc_status: string;

  @Prop({ type: Types.ObjectId, ref: 'Admin' })
  verified_by_admin_id?: Types.ObjectId;

  @Prop()
  verification_date?: Date;

  @Prop()
  rejection_reason?: string;

  @Prop()
  notes?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Filter', default: [] })
  filter_preferences?: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
