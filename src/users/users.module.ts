import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { WorkExperience } from './entities/work-experience.entity';
import { Education } from './entities/education.entity';
import { Certification } from './entities/certification.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUserController } from './admin-user.controller';
import { AuthModule } from 'src/auth/auth.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { Filter } from 'src/filter/entities/filter.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WorkExperience,
      Education,
      Certification,
      Filter,
      Country,
      Language,
    ]),
    forwardRef(() => AuthModule),
    FirebaseModule,
  ],
  controllers: [UsersController, AdminUserController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
