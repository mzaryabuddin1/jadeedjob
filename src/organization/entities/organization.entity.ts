import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { OrgMember } from './org-member.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  industry: string;

  @Column({ default: 'active' })
  isActive: string;

  @Column()
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrgMember, (member) => member.organization, {
    cascade: true,
  })
  members: OrgMember[];
}
