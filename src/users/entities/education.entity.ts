import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  highest_qualification: string;

  @Column({ nullable: true })
  institution_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  field_of_study: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  start_year: string | null;

  @Column({ nullable: true })
  graduation_year: string;

  @Column({ nullable: true })
  gpa_or_grade: string;

  @Column({ nullable: true })
  degree_document: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => User, (user) => user.education, {
    onDelete: 'CASCADE',
  })
  user: User;
}
