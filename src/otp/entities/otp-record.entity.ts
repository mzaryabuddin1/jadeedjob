import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OtpPurpose =
  | 'register'
  | 'forgot-password'
  | 'phone-change'
  | 'password-change';

@Entity('otp_records')
@Index(['purpose', 'target', 'userId'])
export class OtpRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['register', 'forgot-password', 'phone-change', 'password-change'],
  })
  purpose: OtpPurpose;

  @Column()
  target: string;

  @Column({ nullable: true })
  userId: number;

  @Column()
  codeHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 0 })
  resendCount: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
