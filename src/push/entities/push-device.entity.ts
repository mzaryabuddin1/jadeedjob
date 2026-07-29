import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('push_devices')
@Unique('UQ_push_devices_user_installation', ['userId', 'installationId'])
@Index('IDX_push_devices_token', ['token'], { unique: true })
export class PushDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_push_devices_user',
  })
  user: User;

  @Column({ length: 120 })
  installationId: string;

  @Column({ length: 512 })
  token: string;

  @Column({ type: 'enum', enum: ['ios', 'android'] })
  platform: 'ios' | 'android';

  @Column({ nullable: true, length: 40 })
  appVersion: string;

  @Column({ nullable: true, length: 20 })
  locale: string;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
