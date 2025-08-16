import {
  Injectable,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { PayWithBankTransferDto } from './dto/pay-with-bank-transfer.dto';
import { WalletToWalletTransferDto } from './dto/wallet-to-wallet-transfer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { response } from 'express';
import { CreateDynamicAccountDto } from './dto/create-dynamic-account.dto';

@Injectable()
export class FlutterwaveService {
  private httpClient: AxiosInstance;
  private oauthTokenUrl =
    'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
  private cachedAccessToken: string | null = null;
  private cachedAccessTokenExpiresAtMs = 0;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('FLW_API_BASE') ??
      'https://api.flutterwave.cloud/developersandbox/';
    this.httpClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });
  }

  private async getAccessToken(): Promise<string> {
    // If we have a valid cached token, reuse it
    const now = Date.now();
    if (
      this.cachedAccessToken &&
      now < this.cachedAccessTokenExpiresAtMs - 5000
    ) {
      return this.cachedAccessToken;
    }

    const clientId = this.configService.get<string>('FLW_CLIENT_ID');
    const clientSecret = this.configService.get<string>('FLW_CLIENT_SECRET');
    const fallbackSecretKey = this.configService.get<string>('FLW_SECRET_KEY');

    // Prefer OAuth2 client credentials when clientId/clientSecret provided; otherwise fall back to static secret key
    if (clientId && clientSecret) {
      const params = new URLSearchParams();
      params.set('client_id', clientId);
      params.set('client_secret', clientSecret);
      params.set('grant_type', 'client_credentials');

      try {
        const response = await axios.post(this.oauthTokenUrl, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const accessToken: string = response.data?.access_token;
        const expiresInSeconds: number = response.data?.expires_in ?? 600; // default 10m if unspecified
        if (!accessToken) {
          throw new Error('No access_token returned from Flutterwave OAuth');
        }
        this.cachedAccessToken = accessToken;
        this.cachedAccessTokenExpiresAtMs =
          Date.now() + expiresInSeconds * 1000;
        return accessToken;
      } catch (error: any) {
        if (error?.response) {
          throw new HttpException(error.response.data, error.response.status);
        }
        throw new InternalServerErrorException(
          error?.message ?? 'Failed to obtain Flutterwave OAuth token',
        );
      }
    }

    if (fallbackSecretKey) {
      // Backward-compatible fallback: use static secret key as bearer
      return fallbackSecretKey;
    }

    throw new InternalServerErrorException(
      'Flutterwave credentials not configured. Set FLW_CLIENT_ID and FLW_CLIENT_SECRET (preferred) or FLW_SECRET_KEY in .env',
    );
  }

  async createCustomer(payload: CreateCustomerDto) {
    const {address, email, name, phone } = payload;
    if (!email || !name || !phone)
      throw new BadRequestException('Please include all the required details');

    try {
      const accessToken = await this.getAccessToken();
      const response = await this.httpClient.post(
        '/customers',
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data) {
    console.error(
      'Flutterwave validation errors:',
      JSON.stringify(error.response.data, null, 2)
    );
    throw new HttpException(
      error.response.data,
      error.response.status
    );
  }
    }
  }

  async updateCustomer(payload: CreateCustomerDto, id: string) {
    const {address, email, name, phone } = payload;
    if (!email || !name || !phone)
      throw new BadRequestException('Please include all the required details');

    try {
      const accessToken = await this.getAccessToken();
      const response = await this.httpClient.put(
        `/customers/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data) {
    console.error(
      'Flutterwave validation errors:',
      JSON.stringify(error.response.data, null, 2)
    );
    throw new HttpException(
      error.response.data,
      error.response.status
    );
  }
    }
  }

  async createDynamicVirtualAccount(payload: CreateDynamicAccountDto) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await this.httpClient.post(
        '/virtual-accounts',
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data;
    } catch (error) {
      if (error?.response) {
        // Log the validation errors if they exist
        if (error.response.data?.error?.validation_errors) {
          console.error('Flutterwave validation errors:', error.response.data.error.validation_errors);
        }
        // Pass through raw Flutterwave error JSON and status code
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new InternalServerErrorException(
        error?.message ?? 'Flutterwave request failed',
      );
    }
  }

  async getCustomer(id: string) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await this.httpClient.get(`/customers/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      if (error?.response) {
        // Pass through raw Flutterwave error JSON and status code
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new InternalServerErrorException(
        error?.message ?? 'Flutterwave request failed',
      );
    }
  }

  async getAllCustomers() {
    const accessToken = await this.getAccessToken();
    const response = await this.httpClient.get('/customers?page=1&size10', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }
  // async payWithBankTransfer(payload: PayWithBankTransferDto) {

  // }

  // async walletToWalletTransfer(payload: WalletToWalletTransferDto) {

  // }
}
