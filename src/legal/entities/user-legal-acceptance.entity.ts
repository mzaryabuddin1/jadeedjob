import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import {
  LegalDocument,
  LegalDocumentType,
} from './legal-document.entity';

@Entity('user_legal_acceptances')
@Unique('UQ_user_legal_acceptances_user_document', ['userId', 'legalDocumentId'])
@Index('IDX_user_legal_acceptances_user_type', ['userId', 'documentType'])
export class UserLegalAcceptance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_user_legal_acceptances_user',
  })
  user: User;

  @Column()
  legalDocumentId: number;

  @ManyToOne(() => LegalDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'legalDocumentId',
    foreignKeyConstraintName: 'FK_user_legal_acceptances_document',
  })
  legalDocument: LegalDocument;

  @Column({
    type: 'enum',
    enum: ['terms', 'privacy', 'community_guidelines'],
  })
  documentType: LegalDocumentType;

  @Column({ length: 80 })
  version: string;

  @Column({
    type: 'enum',
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown',
  })
  clientPlatform: 'ios' | 'android' | 'web' | 'unknown';

  @CreateDateColumn()
  acceptedAt: Date;
}
