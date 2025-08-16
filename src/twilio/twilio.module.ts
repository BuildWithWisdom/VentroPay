import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';
import { AuthService } from 'src/auth/auth.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';

@Module({
  controllers: [TwilioController],
  providers: [TwilioService, AuthService, FlutterwaveService],
})
export class TwilioModule {}
