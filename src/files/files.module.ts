import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    MulterModule.register({}),
    StorageModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService], // ✅ So other modules can use it
})
export class FilesModule {}
