import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { allTools } from './ai.tools';
import { AuthService } from '../auth/auth.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';

@Injectable()
export class AiService {
  private genAI: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in the .env file');
    }
    this.genAI = new GoogleGenAI({ apiKey: apiKey });
  }

  /**
   * Processes an incoming message using the AI model.
   * It manages conversation history, function calling, and error handling.
   * @param message The content of the user's message.
   * @param user The user object from the database.
   * @param history The previous conversation history.
   * @returns A natural language response from the AI.
   */
  async processMessage(message: string, user: any, history: any[]) {
    const tools = [{ functionDeclarations: allTools }];

    // Core instructions for the AI model.
    const systemPrompt =
      'You are a helpful and friendly assistant for VentroPay. Your primary goal is to guide new users through the onboarding process. Use the `getOnboardingStatus` tool to check what step the user needs to complete next. Be proactive and lead the conversation.';

    // Workaround for older library versions: Prepend system prompt to the first user message.
    const firstMessage =
      history.length === 0 ? `${systemPrompt}\n\n${message}` : message;

    const conversation = [
      ...history,
      { role: 'user', parts: [{ text: firstMessage }] },
    ];

    // First API call: Get the AI's response, which may include a function call.
    const initialResponse = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: conversation,
      config: {
        tools: tools,
      },
    });

    // If the model requests a function call, execute it.
    if (
      initialResponse.functionCalls &&
      initialResponse.functionCalls.length > 0
    ) {
      const functionCall = initialResponse.functionCalls[0];
      console.log(`Function to call: ${functionCall.name}`);
      console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);

      if (!functionCall.args) {
        console.error('Function call arguments are missing.');
        return 'An internal error occurred. Missing arguments.';
      }

      let functionExecutionResult: any;

      // Route the function call to the appropriate internal logic.
      switch (functionCall.name) {
        case 'getOnboardingStatus': {
          console.log('Executing getOnboardingStatus logic...');
          if (!user.email) {
            functionExecutionResult = { status: 'NEEDS_EMAIL' };
          } else if (!user.email_verified) {
            functionExecutionResult = { status: 'NEEDS_VERIFICATION' };
          } else if (!user.full_name) {
            functionExecutionResult = { status: 'NEEDS_FULL_NAME' };
          } else {
            functionExecutionResult = { status: 'ONBOARDED' };
          }
          break;
        }

        case 'registerEmail': {
          console.log('Executing registerEmail logic...');
          try {
            const { email } = functionCall.args as { email: string };
            await this.authService.updateUserEmail(user.id, email);
            await this.authService.client.auth.signInWithOtp({
              email: email,
              options: {
                shouldCreateUser: true,
              },
            });
            functionExecutionResult = { success: true, email: email };
          } catch (error) {
            console.error('Error in registerEmail:', error);
            functionExecutionResult = { success: false, error: error.message };
          }
          break;
        }

        case 'verifyEmailOtp': {
          console.log('Executing verifyEmailOtp logic...');
          try {
            const { otp } = functionCall.args as { otp: string };
            await this.authService.client.auth.verifyOtp({
              email: user.email,
              token: otp,
              type: 'email' as 'email',
            });
            await this.authService.updateUserEmailVerified(user.id, true);
            functionExecutionResult = { success: true };
          } catch (error) {
            console.error('Error in verifyEmailOtp:', error);
            functionExecutionResult = { success: false, error: error.message };
          }
          break;
        }

        case 'registerFullNameAndCreateAccounts': {
          console.log('Executing registerFullNameAndCreateAccounts logic...');
          try {
            const { firstName, lastName } = functionCall.args as {
              firstName: string;
              lastName: string;
            };
            const structuredFullName = { first_name: firstName, last_name: lastName };
            await this.authService.updateUserFullName(user.id, structuredFullName);

            const flutterwavePayload = {
              email: user.email,
              name: { first: firstName, middle: 'Empty', last: lastName },
              phone: {
                country_code: user.phone_number.code.slice(1),
                number: user.phone_number.number,
              },
            };
            const flutterwaveCustomer = await this.flutterwaveService.createCustomer(flutterwavePayload);
            await this.authService.updateUserFlutterwaveCustomerId(user.id, flutterwaveCustomer.data.id);

            const dynamicAccountPayload = {
              reference: `vp-${user.id.substring(0, 18)}-${Date.now()}`,
              customer_id: flutterwaveCustomer.data.id,
              expiry: 31536000,
              amount: 20000,
              currency: 'NGN',
              account_type: 'dynamic',
              narration: `${firstName} ${lastName} VentroPay Account`,
            };
            const virtualAccount = await this.flutterwaveService.createDynamicVirtualAccount(dynamicAccountPayload);
            await this.authService.updateUserVirtualAccountDetails(
              user.id,
              virtualAccount.data.account_number,
              virtualAccount.data.account_bank_name, // Bug fix: was passing amount
            );

            functionExecutionResult = {
              success: true,
              accountNumber: virtualAccount.data.account_number,
              bankName: virtualAccount.data.account_bank_name,
            };
          } catch (error) {
            console.error('Error in registerFullNameAndCreateAccounts:', error);
            functionExecutionResult = { success: false, error: error.message };
          }
          break;
        }

        default: {
          console.error(`Unknown function call: ${functionCall.name}`);
          functionExecutionResult = { success: false, error: 'Unknown function' };
          break;
        }
      }

      // If a function call fails, bypass the AI and return a static error message.
      if (functionExecutionResult.success === false) {
        console.error(
          'A function call failed. Bypassing AI for response.',
          functionExecutionResult.error,
        );
        return "I'm sorry, an error occurred on our end. Please try again in a moment. If the problem continues, please contact support.";
      }

      // Second API call: Send the function result back to the model for a natural language response.
      const finalResponse = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...conversation,
          { role: 'model', parts: [{ functionCall: functionCall }] },
          {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  response: functionExecutionResult,
                },
              },
            ],
          },
        ],
        config: {
          tools: tools,
        },
      });

      return finalResponse.text; // Return the final text to the controller
    } else {
      // If no function call was made, just return the AI's text response.
      return initialResponse.text;
    }
  }
}
