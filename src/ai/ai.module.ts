import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AuthService } from 'src/auth/auth.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AuthService, FlutterwaveService],
  exports: [AiService],
})
export class AiModule {}