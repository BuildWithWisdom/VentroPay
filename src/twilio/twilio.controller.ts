import { Controller, Post, Body, Req, Query, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { TwilioService } from './twilio.service';
import { AuthService } from '../auth/auth.service';
import { AiService } from '../ai/ai.service';

@Controller('twilio')
export class TwilioController {
  // NOTE: In a production app, conversation history will be stored in a persistent database (e.g., Redis or a SQL table).
  private conversationHistories: Record<string, any[]> = {};

  constructor(
    private readonly twilioService: TwilioService,
    private readonly authService: AuthService,
    private readonly aiService: AiService,
  ) {}

  private VERIFY_TOKEN = 'ventropay';

  @Post("webhook")
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    console.log('Received webhook verification request:');
    console.log('  hub.mode:', mode);
    console.log('  hub.verify_token:', token);
    console.log('  hub.challenge:', challenge);

    if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
      console.log('✅ Webhook verified!');
      res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook verification failed.');
      console.error('  Expected token:', this.VERIFY_TOKEN);
      console.error('  Received token:', token);
      res.sendStatus(403);
    }
  }

  /**
   * Handles incoming WhatsApp messages from Twilio.
   */
  // @Post('webhook')
  async webhook(@Body() body: any, @Req() req: any) {
    const message = body.Body?.trim();
    const rawPhoneNumber = body.From;

    // Immediately send a "typing..." indicator for better UX.
    await this.twilioService.sendWhatsappMessage(
      rawPhoneNumber,
      'VentroPay is typing...',
    );

    // Retrieve or initialize the user's conversation history.
    const history = this.conversationHistories[rawPhoneNumber] || [];

    // 1. Find or create a user account based on their phone number.
    const user = await this.authService.handleWhatsappUser(rawPhoneNumber);

    // 2. Delegate the core logic to the AI service to get a response.
    const aiResponse = await this.aiService.processMessage(
      message,
      user,
      history,
    );

    // 3. Send the AI's final response back to the user.
    if (aiResponse) {
      await this.twilioService.sendWhatsappMessage(rawPhoneNumber, aiResponse);
    } else {
      // Fallback message if the AI service fails to return a response.
      console.error('AI service did not return a response.');
      await this.twilioService.sendWhatsappMessage(
        rawPhoneNumber,
        'Sorry, I encountered an error. Please try again.',
      );
    }

    // 4. Update the in-memory history with the latest turn.
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: aiResponse || '' }] });
    this.conversationHistories[rawPhoneNumber] = history;

    return 'ok';
  }
}