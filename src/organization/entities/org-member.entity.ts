import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('org_members')
export class OrgMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organizationId: number;

  @Column()
  userId: number;

  @Column({ default: 'user' })
  role: 'owner' | 'admin' | 'user';

  @ManyToOne(() => Organization, (org) => org.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
