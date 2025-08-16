import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';
import { PayWithBankTransferDto } from './dto/pay-with-bank-transfer.dto';
import { WalletToWalletTransferDto } from './dto/wallet-to-wallet-transfer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateDynamicAccountDto } from './dto/create-dynamic-account.dto';

@Controller('test')
export class FlutterwaveController {
  constructor(private readonly flutterwaveService: FlutterwaveService) {}

  @Post('create-customer')
  async createCustomer(@Body() body: CreateCustomerDto) {
    const result = await this.flutterwaveService.createCustomer(body);
    return result;
  }

  @Put('customers/:id') 
  async updateCustomer(@Body() body: CreateCustomerDto, @Param("id") id: string) {
    const result = await this.flutterwaveService.updateCustomer(body, id)
    return result;
  }

  @Get('customers/:id')
  async getCustomer(@Param('id') id: string) {
    return await this.flutterwaveService.getCustomer(id);
  }

  @Get('customers')
  async getAllCustomers() {
    return await this.flutterwaveService.getAllCustomers();
  }

  @Post('create-virtual-account') 
  async createVirtualAccount(@Body() body: CreateDynamicAccountDto) {
    const result = await this.flutterwaveService.createDynamicVirtualAccount(body)
    return result
  }

  // @Post('pay-with-bank-transfer')
  // async payWithBankTransfer(@Body() body: PayWithBankTransferDto) {
  //   // Body should contain: amount, currency, email, phone_number
  //   const result = await this.flutterwaveService.payWithBankTransfer(body);
  //   return result; // raw JSON
  // }

  // @Post('wallet-to-wallet-transfer')
  // async walletToWalletTransfer(@Body() body: WalletToWalletTransferDto) {
  //   // Body should contain: account_bank, account_number, amount, currency
  //   const result = await this.flutterwaveService.walletToWalletTransfer(body);
  //   return result; // raw JSON
  // }
}
