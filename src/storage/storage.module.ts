import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredAsset } from './entities/stored-asset.entity';
import { ObjectStorageService } from './object-storage.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([StoredAsset])],
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
