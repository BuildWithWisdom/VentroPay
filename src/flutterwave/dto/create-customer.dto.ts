import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerAddress {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}

export class CustomerName {
  @IsString()
  @IsNotEmpty()
  first: string;

  @IsString()
  middle?: string;

  @IsString()
  @IsNotEmpty()
  last: string;
}

export class CustomerPhone {
  @IsString()
  @IsNotEmpty()
  country_code: string;

  @IsString()
  @IsNotEmpty()
  @Length(7, 10)
  number: string;
}

export class CreateCustomerDto {
  @ValidateNested()
  @Type(() => CustomerAddress)
  address?: CustomerAddress;

  @IsEmail()
  @IsNotEmpty()
  email: string | any;

  meta?: object;

  @ValidateNested()
  @Type(() => CustomerName)
  name: CustomerName;

  @ValidateNested()
  @Type(() => CustomerPhone)
  phone: CustomerPhone;
}
