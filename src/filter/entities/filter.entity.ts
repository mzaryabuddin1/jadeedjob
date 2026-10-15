import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
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

/** Normalize legacy string icons → tabler object (shared by filters + jobs) */
export function normalizeFilterIcon(
  icon: FilterIcon | string | null | undefined,
): FilterIcon {
  if (!icon) {
    return { type: 'tabler', name: 'briefcase' };
  }
  if (typeof icon === 'string') {
    // Legacy: "{ icon: 'hammer' }" or "hammer" or "fas fa-..."
    const match = icon.match(/icon:\s*'([^']+)'/);
    const name =
      match?.[1] || icon.replace(/^fas\s+fa-/, '').trim() || 'briefcase';
    return { type: 'tabler', name };
  }
  if (icon.type === 'tabler' && icon.name) {
    return { type: 'tabler', name: String(icon.name).trim() };
  }
  if (icon.type === 'custom' && icon.svg) {
    return { type: 'custom', svg: String(icon.svg) };
  }
  return { type: 'tabler', name: 'briefcase' };
}

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

  /** Jobs tagged with this filter (many-to-many via job_filters) */
  @ManyToMany(() => Job, (job) => job.filters)
  taggedJobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
