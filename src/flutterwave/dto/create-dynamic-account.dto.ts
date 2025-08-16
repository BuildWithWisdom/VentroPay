import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDynamicAccountDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @IsNumber()
  @IsNotEmpty()
  expiry: number; // In seconds

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  account_type: string; // Literal type

  @IsString()
  @IsNotEmpty()
  narration: string;
}
