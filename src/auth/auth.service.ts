import { Injectable } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Manages Supabase database interactions.
@Injectable()
export class AuthService {
  public client: SupabaseClient;

  // Initializes Supabase client.
  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = 'https://qrmmsanjrrzqszkyswdr.supabase.co';
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseKey) {
      throw new Error('SUPABASE_KEY is not set in the .env file');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // Finds/creates user by WhatsApp phone number.
  async handleWhatsappUser(rawPhoneNumber: string) {
    // Normalize phone number (e.g., '+2349064265399').
    const e164PhoneNumber = rawPhoneNumber.replace('whatsapp:', '');

    // Parse for structured details (for JSONB column).
    const phoneNumberParsed = parsePhoneNumberFromString(e164PhoneNumber);

    // Validate parsed number.
    if (!phoneNumberParsed || !phoneNumberParsed.isValid()) {
      console.error('Invalid phone number received:', rawPhoneNumber);
      throw new Error('Invalid phone number format.');
    }

    // Create structured object for JSONB column.
    const structuredPhoneNumber = {
      code: `+${phoneNumberParsed.countryCallingCode}`,
      number: phoneNumberParsed.nationalNumber,
    };

    // Check for existing user using TEXT column.
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('phone_number_text', e164PhoneNumber)
      .single();

    // Handle lookup errors (ignore 'no rows found').
    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user:', error.message);
      throw new Error('Error finding user');
    }

    // If user found, return it.
    if (data) {
      console.log('Found existing user');
      return data;
    }

    // If user not found, create new user.
    const { data: newUser, error: insertError } = await this.client
      .from('users')
      .insert([
        {
          phone_number_text: e164PhoneNumber, // Store E.164
          phone_number: structuredPhoneNumber, // Store JSONB
        },
      ])
      .select()
      .single();

    // Handle creation errors.
    if (insertError) {
      console.error('Error creating user:', insertError.message);
      throw new Error('Error creating user...');
    }

    // Return newly created user.
    return newUser;
  }

  /**
   * Deletes all user records from the 'public.users' table.
   * WARNING: This method is for development and testing purposes only.
   * It will permanently remove all data from the users table.
   */
  async deleteAllUsers() {
    console.log('Attempting to delete all users...');
    const { error } = await this.client
      .from('users')
      .delete()
      .not('id', 'is', null); // Corrected: Use .not('id', 'is', null) for mass delete

    if (error) {
      console.error('Error deleting users:', error.message);
      throw new Error('Error deleting all users.');
    }

    console.log('All users deleted successfully.');
  }

  // Fetches all users.
  async findAllUsers() {
    const { data, error } = await this.client.from('users').select('*');

    if (error) {
      console.error('Error fetching data:', error.message);
    }

    return data;
  }

  /**
   * Updates a user's email in the database.
   */
  async updateUserEmail(userId: string, email: string) {
    const { error } = await this.client
      .from('users')
      .update({ email: email })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user email:', error.message);
      throw new Error('Could not update user email.');
    }
    console.log(`User ${userId} email updated to ${email}.`);
  }

  /**
   * Updates a user's email verification status in the database.
   */
  async updateUserEmailVerified(userId: string, verified: boolean) {
    const { error } = await this.client
      .from('users')
      .update({ email_verified: verified })
      .eq('id', userId);

    if (error) {
      console.error('Error updating email verification status:', error.message);
      throw new Error('Could not update email verification status.');
    }
    console.log(`User ${userId} email_verified status set to ${verified}.`);
  }

  /**
   * Updates a user's full name in the database.
   */
  async updateUserFullName(
    userId: string,
    fullName: { first_name: string; last_name: string },
  ) {
    const { error } = await this.client
      .from('users')
      .update({ full_name: fullName }) // full_name is JSONB
      .eq('id', userId);

    if (error) {
      console.error('Error updating user full name:', error.message);
      throw new Error('Could not update user full name.');
    }
    console.log(
      `User ${userId} full name updated to ${fullName.first_name} ${fullName.last_name}.`,
    );
  }

  /*
     * Updates a user's Flutterwave customer ID
      in the database.
    */
  async updateUserFlutterwaveCustomerId(userId: string, customerId: string) {
    const { error } = await this.client
      .from('users')
      .update({ flutterwave_customer_id: customerId })
      .eq('id', userId);

    if (error) {
      console.error('Error updating Flutterwave customer ID:', error.message);
      throw new Error('Could not update Flutterwave customer ID.');
    }
    console.log(
      `User ${userId} flutterwave customer ID updated to ${customerId}.`,
    );
  }

  /*
      Updates a user's National Identification
      Number (NIN) in the database.
    */

  async updateUserNin(userId: string, customerNin: string) {
    const { error } = await this.client
      .from('users')
      .update({ nin: customerNin })
      .eq('id', userId);
    if (error) {
      console.error('Error updating NIN:', error.message);
      throw new Error('Could not update NIN.');
    }
    console.log(`User ${userId} NIN updated to ${customerNin}.`);
  }

  /**
   * Updates a user's virtual account details in the database.
   */
  async updateUserVirtualAccountDetails(
    userId: string,
    accountNumber: string,
    bankName: string,
  ) {
    const { error } = await this.client
      .from('users')
      .update({
        flutterwave_virtual_account_number: accountNumber,
        flutterwave_virtual_bank_name: bankName,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating virtual account details:', error.message);
      throw new Error('Could not update virtual account details.');
    }
    console.log(`User ${userId} virtual account details updated.`);
  }
}
