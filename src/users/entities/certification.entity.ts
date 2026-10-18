import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  certification_name: string;

  @Column({ nullable: true })
  issuing_institution: string;

  @Column({ type: 'date', nullable: true })
  certification_date: Date;

  @Column({ nullable: true })
  certificate_file: string;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  credential_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  credential_url: string | null;

  @ManyToOne(() => User, (user) => user.certifications, {
    onDelete: 'CASCADE',
  })
  user: User;
}
