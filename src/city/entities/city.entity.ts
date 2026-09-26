import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Country } from 'src/country/entities/country.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Country, (country) => country.cities, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @Column()
  countryId: number;

  @OneToMany(() => User, (user) => user.cityEntity)
  users: User[];
}
