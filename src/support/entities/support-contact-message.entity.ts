import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('support_contact_messages')
export class SupportContactMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  source: string;

  @Column({ default: 'received' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
