import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpRecord } from './entities/otp-record.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OtpRecord])],
    providers: [OtpService],
    exports: [OtpService],
})
export class OtpModule {}
