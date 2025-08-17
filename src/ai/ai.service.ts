import { Injectable } from '@nestjs/common';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, Type } from '@google/genai';
import { ConfigService } from '@nestjs/config';

const registerUserEmailFunctionDeclaration = {
  name: 'registerUserEmail',
  description: 'Takes the user email and registers the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      email: {
        type: Type.STRING,
        description: 'The email address of the user. e.g. user@gmail.com',
      },
    },
    required: ['email'],
  },
};
@Injectable()
export class AiService {
  private genAI: GoogleGenAI;
  private readonly tools: any[];

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in the .env file');
    }
    this.genAI = new GoogleGenAI({apiKey: apiKey});
  }

  async handleEmail(message: string) {
    // First request to get the function call
    const initialResponse = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ functionDeclarations: [registerUserEmailFunctionDeclaration] }],
      },
    });

    if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
      const functionCall = initialResponse.functionCalls[0];
      console.log(`Function to call: ${functionCall.name}`);
      console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);

      // Simulate executing the function and getting a result
      // In a real scenario, you would save the email to the database here
      if (!functionCall.args) {
        console.error('Function call arguments are missing.');
        return;
      }

      const functionExecutionResult = {
        success: true,
        email: functionCall.args.email,
      };

      // Second request, sending the function's result back to the model
      const finalResponse = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: message }] },
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
          tools: [{ functionDeclarations: [registerUserEmailFunctionDeclaration] }],
        },
      });

      // Log the final natural language response
      console.log('Final Response from AI:', finalResponse.text);
    } else {
      // If no function call was made, just log the text response
      console.log('Final Response from AI:', initialResponse.text);
    }
  }

}