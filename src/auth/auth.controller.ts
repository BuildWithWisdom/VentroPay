import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-whatsapp-user')
  handleWhatsappUser(@Body() phoneNumber: string) {
    return this.authService.handleWhatsappUser(phoneNumber);
  }

  @Get('users')
  findAll() {
    return this.authService.findAllUsers();
  }

  @Delete('all-users') // This will be accessible via DELETE /auth/all-users
  async deleteAllUsers() {
    // WARNING: This will delete ALL users from your database!
    // Use only for development and testing.
    await this.authService.deleteAllUsers();
    return { message: 'All users deleted successfully.' };
  }
}
