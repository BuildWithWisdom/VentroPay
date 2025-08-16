import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;
  constructor(private readonly configService: ConfigService) {
    const twilioAccountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = twilio(twilioAccountSid, twilioAuthToken);
  }

  async sendWhatsappMessage(to: string, body: string) {
    return await this.client.messages.create({
      from: 'whatsapp:+14155238886',
      to,
      body,
    });
  }
}
