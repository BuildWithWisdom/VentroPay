// async payWithBankTransfer(payload: PayWithBankTransferDto) {
//     const { amount, currency } = payload;
//     if (!amount || !currency) {
//       throw new BadRequestException('amount and currency are required');
//     }

//     try {
//       // Flutterwave Charges (sandbox v4) for bank transfer or specified method
//       const tx_ref = `vp_${Date.now()}`;
//       const accessToken = await this.getAccessToken();
//       const response = await this.httpClient.post('/charges', {
//         tx_ref,
//         ...payload,
//       }, { headers: { Authorization: `Bearer ${accessToken}` } });
//       return response.data;
//     } catch (error: any) {
//       if (error?.response) {
//         // Pass through raw Flutterwave error JSON and status code
//         throw new HttpException(error.response.data, error.response.status);
//       }
//       throw new InternalServerErrorException(error?.message ?? 'Flutterwave request failed');
//     }
//   }

//   async walletToWalletTransfer(payload: WalletToWalletTransferDto) {
//     const { amount, currency } = payload;
//     if (!amount || !currency) {
//       throw new BadRequestException('amount and currency are required');
//     }

//     try {
//       // Flutterwave Transfers (sandbox v4) wallet transfer
//       const reference = `vp_transfer_${Date.now()}`;
//       const accessToken = await this.getAccessToken();
//       const response = await this.httpClient.post('/transfers', {
//         reference,
//         ...payload,
//       }, { headers: { Authorization: `Bearer ${accessToken}` } });
//       return response.data;
//     } catch (error: any) {
//       if (error?.response) {
//         throw new HttpException(error.response.data, error.response.status);
//       }
//       throw new InternalServerErrorException(error?.message ?? 'Flutterwave transfer failed');
//     }
//   }
// }
