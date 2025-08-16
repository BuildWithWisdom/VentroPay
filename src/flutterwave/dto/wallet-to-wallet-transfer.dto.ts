export interface WalletToWalletTransferDto {
  amount: number;
  currency: string;
  narration?: string;
  // Include recipient fields for v4 wallet transfer schema (flexible for sandbox changes)
  [key: string]: any;
}
