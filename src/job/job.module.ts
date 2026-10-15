import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { Filter } from 'src/filter/entities/filter.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Filter, User, CompanyPage]),
    FirebaseModule,
    FilesModule,
  ],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
