import { Controller, Post, Body, Req } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { AuthService } from '../auth/auth.service';
// import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';

import { AiService } from '../ai/ai.service';

@Controller('twilio')
export class TwilioController {
  // NOTE: In a production app, this would be stored in a database (e.g., Redis or a SQL table)
  private conversationHistories: Record<string, any[]> = {};

  constructor(
    private readonly twilioService: TwilioService,
    private readonly authService: AuthService,
    // private readonly flutterwaveService: FlutterwaveService, // Keep for future use
    private readonly aiService: AiService,
  ) {}

  @Post('webhook')
  async webhook(@Body() body: any, @Req() req: any) {
    console.log('Incoming from twilio: ', body);
    const message = body.Body?.trim();
    const rawPhoneNumber = body.From;

    // --- Typing Indicator and History Management ---
    await this.twilioService.sendWhatsappMessage(
      rawPhoneNumber,
      'VentroPay is typing...',
    );

    // Retrieve or initialize conversation history
    const history = this.conversationHistories[rawPhoneNumber] || [];

    // 1. Get or create user. This remains the same.
    const user = await this.authService.handleWhatsappUser(rawPhoneNumber);

    // 2. Let the AI service process the message and decide what to do.
    const aiResponse = await this.aiService.processMessage(
      message,
      user,
      history,
    );

    // 3. Send the AI's response back to the user.
    if (aiResponse) {
      await this.twilioService.sendWhatsappMessage(rawPhoneNumber, aiResponse);
    } else {
      // Fallback message if the AI service returns nothing
      console.error('AI service did not return a response.');
      await this.twilioService.sendWhatsappMessage(
        rawPhoneNumber,
        'Sorry, I encountered an error. Please try again.',
      );
    }

    // 4. Update and save the conversation history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: aiResponse || '' }] });
    this.conversationHistories[rawPhoneNumber] = history;

    return 'ok';
  }
}
