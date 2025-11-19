import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.language)
  users: User[];
}
