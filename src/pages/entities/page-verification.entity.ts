import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Page } from './page.entity';

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';

export const VERIFICATION_DOC_TYPES = [
  'business_license',
  'registration_certificate',
  'tax_document',
  'id_proof',
  'utility_bill',
  'other',
] as const;
export type VerificationDocType = (typeof VERIFICATION_DOC_TYPES)[number];

/** One uploaded company document (the file itself lives in private storage) */
export type VerificationDocument = {
  type: VerificationDocType;
  originalName: string;
  /** file name inside ./private-uploads - never sent to the app */
  storedName: string;
  mimeType: string;
  size: number;
};

/** A page owner/admin asking for the verified tick, with proof documents */
@Entity('page_verification_requests')
@Index('IDX_page_verification_page', ['pageId', 'status'])
export class PageVerificationRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pageId: number;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page;

  @Column()
  submittedBy: number;

  @Column({ type: 'json' })
  documents: VerificationDocument[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: VerificationRequestStatus;

  /** Label of the staff member who decided (admin tool) */
  @Column({ type: 'varchar', length: 60, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
