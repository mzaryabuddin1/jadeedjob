import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('work_experience')
export class WorkExperience {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  employment_type: string;

  @Column({ nullable: true })
  from_date: Date;

  @Column({ nullable: true })
  to_date: Date;

  @Column({ nullable: true })
  key_responsibilities: string;

  @Column({ nullable: true })
  experience_certificate: string;

  @Column({ default: false })
  currently_working: boolean;

  @ManyToOne(() => User, (user) => user.work_experience, {
    onDelete: 'CASCADE',
  })
  user: User;
}
