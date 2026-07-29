import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('notification_preferences')
@Unique('UQ_notification_preferences_user', ['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_notification_preferences_user',
  })
  user: User;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: true })
  jobs: boolean;

  @Column({ default: true })
  applications: boolean;

  @Column({ default: true })
  messages: boolean;

  @Column({ default: true })
  community: boolean;

  @Column({ default: true })
  videos: boolean;

  @Column({ default: true })
  company: boolean;

  @Column({ default: true })
  support: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
