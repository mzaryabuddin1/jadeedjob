import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type LegalDocumentType =
  | 'terms'
  | 'privacy'
  | 'community_guidelines';

@Entity('legal_documents')
@Unique('UQ_legal_documents_type_version', ['documentType', 'version'])
@Index('IDX_legal_documents_current', ['documentType', 'isCurrent'])
export class LegalDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['terms', 'privacy', 'community_guidelines'],
  })
  documentType: LegalDocumentType;

  @Column({ length: 80 })
  version: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 1000 })
  contentUrl: string;

  @Column({ type: 'datetime' })
  effectiveAt: Date;

  @Column({ type: 'datetime' })
  publishedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  supersededAt: Date | null;

  @Column({ default: true })
  isCurrent: boolean;

  @Column({ nullable: true })
  publishedByAdminId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
