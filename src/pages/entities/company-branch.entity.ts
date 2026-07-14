import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyPage } from './company-page.entity';

@Entity('company_branches')
export class CompanyBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @ManyToOne(() => CompanyPage, (company) => company.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: CompanyPage;

  @Column()
  label: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'float', nullable: true })
  lat: number;

  @Column({ type: 'float', nullable: true })
  lng: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
