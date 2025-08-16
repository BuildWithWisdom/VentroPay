import { Controller, Post, Body, Req } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { AuthService } from '../auth/auth.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';

// Validates email format.
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Checks if a string is numeric.
function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

@Controller('twilio')
export class TwilioController {
  constructor(
    private readonly twilioService: TwilioService,
    private readonly authService: AuthService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  @Post('webhook')
  async webhook(@Body() body: any, @Req() req: any) {
    console.log('Incoming from twilio: ', body);
    const message = body.Body?.trim();
    const rawPhoneNumber = body.From;

    // Get or create user.
    const user = await this.authService.handleWhatsappUser(rawPhoneNumber);

    // Onboarding Flow
    // Scenario A: Handle email submission.
    if (!user.email && isValidEmail(message)) {
      try {
        // Update email and send verification code.
        await this.authService.updateUserEmail(user.id, message);
        await this.authService.client.auth.signInWithOtp({
          email: message,
          options: {
            shouldCreateUser: true,
          },
        });

        // Respond to user.
        await this.twilioService.sendWhatsappMessage(
          rawPhoneNumber,
          `Thank you for your email (${message}). A verification code has been sent to your inbox. Please reply with the code.`,
        );
      } catch (error) {
        console.error('Error processing email or sending OTP:', error);
        await this.twilioService.sendWhatsappMessage(
          rawPhoneNumber,
          'There was an error processing your email. Please try again or contact support.',
        );
      }
      return 'ok';
    }
    // Prompt for email if missing.
    else if (!user.email) {
      await this.twilioService.sendWhatsappMessage(
        rawPhoneNumber,
        'Welcome to VentroPay! Please reply with your email address to get started.',
      );
      return 'ok';
    }

    // Scenario B: Handle email verification.
    else if (user.email && !user.email_verified && isNumeric(message)) {
      try {
        // Verify OTP.
        const { data: verifyData, error: verifyError } =
          await this.authService.client.auth.verifyOtp({
            email: user.email,
            token: message,
            type: 'email' as 'email',
          });

        if (verifyError) {
          console.error('OTP verification failed:', verifyError.message);
          await this.twilioService.sendWhatsappMessage(
            rawPhoneNumber,
            'Invalid verification code. Please try again.',
          );
        } else if (verifyData.user) {
          // Update verification status and prompt for full name.
          await this.authService.updateUserEmailVerified(user.id, true);
          await this.twilioService.sendWhatsappMessage(
            rawPhoneNumber,
            'Email verified! Please reply with your full name (e.g., John Doe).',
          );
        } else {
          await this.twilioService.sendWhatsappMessage(
            rawPhoneNumber,
            'Verification failed or code expired. Please try again.',
          );
        }
      } catch (error) {
        console.error('Error during OTP verification:', error);
        await this.twilioService.sendWhatsappMessage(
          rawPhoneNumber,
          'There was an error verifying your code. Please try again.',
        );
      }
      return 'ok';
    }
    // Remind user to verify email.
    else if (user.email && !user.email_verified) {
      await this.twilioService.sendWhatsappMessage(
        rawPhoneNumber,
        'Please reply with the verification code sent to your email.',
      );
      return 'ok';
    }

    // Scenario C: Handle full name submission.
    else if (user.email_verified && !user.full_name) {
      try {
        // Parse and update full name.
        const nameParts = message.split(' ').filter((part) => part.length > 0);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const structuredFullName = {
          first_name: firstName,
          last_name: lastName,
        };
        await this.authService.updateUserFullName(user.id, structuredFullName);

        // TODO: Create Flutterwave customer account.
        const flutterwavePayload = {
          email: user.email,
          name: {
            first: firstName,
            middle: "Empty",
            last: lastName,
          },
          phone: {
            country_code: user.phone_number.code.slice(1),
            number: user.phone_number.number,
          },
        };
        const flutterwaveCustomer =
          await this.flutterwaveService.createCustomer(flutterwavePayload);
        await this.authService.updateUserFlutterwaveCustomerId(
          user.id,
          flutterwaveCustomer.data.id,
        );

        // Create dynamic virtual account
        const dynamicAccountPayload = {
          reference: `vp-${user.id.substring(0, 18)}-${Date.now()}`,
          customer_id: flutterwaveCustomer.data.id,
          expiry: 31536000, // 1 year in seconds
          amount: 20000, // As discussed, using 0 for now
          currency: 'NGN', // Assuming NGN, can be made configurable
          account_type: 'dynamic',
          narration: `${firstName} ${lastName} VentroPay Account`,
        };

        // To be replaced with a static account later
        const virtualAccount =
          await this.flutterwaveService.createDynamicVirtualAccount(
            dynamicAccountPayload,
          );
        await this.authService.updateUserVirtualAccountDetails(
          user.id,
          virtualAccount.data.account_number,
          virtualAccount.data.account_bank_name,
        );

        // Send success message with virtual account details.
        await this.twilioService.sendWhatsappMessage(
          rawPhoneNumber,
          `Congratulations, ${firstName}! Your VentroPay account is all set up.\n` +
            `Your virtual account number is: ${virtualAccount.data.account_number} (${virtualAccount.data.account_bank_name}).\n` +
            `We will set up your PIN later.`,
        );
      } catch (error) {
        console.error(
          'Error processing full name or creating customer:',
          error,
        );
        await this.twilioService.sendWhatsappMessage(
          rawPhoneNumber,
          'There was an error processing your name. Please try again or contact support.',
        );
      }
      return 'ok';
    }

    // Scenario D: User is fully onboarded.
    else {
      await this.twilioService.sendWhatsappMessage(
        rawPhoneNumber,
        'Welcome back to VentroPay! How can I help you today?',
      );
      return 'ok';
    }
  }
}
