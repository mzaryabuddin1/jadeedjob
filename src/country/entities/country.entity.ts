import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { City } from 'src/city/entities/city.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string; // e.g., PK, IN

  @Column({ nullable: true })
  dial_code: string; // e.g., +92, +91

  @OneToMany(() => User, (user) => user.country)
  users: User[];

  @OneToMany(() => City, (city) => city.country)
  cities: City[];
}
