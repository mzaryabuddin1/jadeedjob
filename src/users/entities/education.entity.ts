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

  @Column({ nullable: true })
  graduation_year: string;

  @Column({ nullable: true })
  gpa_or_grade: string;

  @Column({ nullable: true })
  degree_document: string;

  @ManyToOne(() => User, (user) => user.education, {
    onDelete: 'CASCADE',
  })
  user: User;
}
