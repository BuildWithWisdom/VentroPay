import { Type } from '@google/genai';

// Tool to check the user's current onboarding status
const getOnboardingStatusDeclaration = {
  name: 'getOnboardingStatus',
  description:
    "Checks the user's current onboarding status to see what the next step is. Use this to guide the user if they seem stuck or are asking general questions.",
  parameters: {},
};

// Tool to register a user's email
const registerEmailDeclaration = {
  name: 'registerEmail',
  description:
    "Saves the user's email address and sends a verification OTP. Use this when the user provides their email address.",
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

// Tool to verify the OTP
const verifyEmailOtpDeclaration = {
  name: 'verifyEmailOtp',
  description:
    "Verifies the user's email using the provided One-Time Password. Use this when the user provides a numeric code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      otp: {
        type: Type.STRING,
        description: "The 6-digit One-Time Password sent to the user's email.",
      },
    },
    required: ['otp'],
  },
};

// Tool to register the user's full name and create accounts
const registerFullNameAndCreateAccountsDeclaration = {
  name: 'registerFullNameAndCreateAccounts',
  description:
    "Saves the user's full name and completes the account setup by creating payment and bank accounts. Use this when the user provides their first and last name.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      firstName: {
        type: Type.STRING,
        description: "The user's first name.",
      },
      lastName: {
        type: Type.STRING,
        description: "The user's last name.",
      },
    },
    required: ['firstName', 'lastName'],
  },
};

export const allTools = [
  getOnboardingStatusDeclaration,
  registerEmailDeclaration,
  verifyEmailOtpDeclaration,
  registerFullNameAndCreateAccountsDeclaration,
];
