import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// MONGO
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CountriesModule } from './countries/countries.module';


@Module({
  imports: [
    ConfigModule.forRoot(), // Loads .env variables
    MongooseModule.forRoot(process.env.MONGODB_URI), 
    CountriesModule, // Connects to MongoDB
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
