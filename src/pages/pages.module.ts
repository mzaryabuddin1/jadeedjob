import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Page } from './entities/page.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Page]),
  ],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
