import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Tabler Icons name for RN: `@tabler/icons-react-native` → IconBriefcase from "briefcase" */
export type TablerFilterIcon = {
  type: 'tabler';
  name: string;
};

/** Inline SVG for custom icons (app renders with SvgXml / similar) */
export type CustomFilterIcon = {
  type: 'custom';
  svg: string;
};

export type FilterIcon = TablerFilterIcon | CustomFilterIcon;

@Entity('filters')
export class Filter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /**
   * Icon payload for mobile:
   * - `{ "type": "tabler", "name": "briefcase" }`
   * - `{ "type": "custom", "svg": "<svg>...</svg>" }`
   */
  @Column({ type: 'json' })
  icon: FilterIcon;

  @Column({ default: 'active' })
  status: 'active' | 'inactive';

  @Column({ default: 'pending' })
  approvalStatus: 'pending' | 'approved' | 'rejected';

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, (user) => user.createdFilters, { nullable: true })
  creator: User;

  @OneToMany(() => Job, (job) => job.filter)
  jobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
