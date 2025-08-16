export interface PayWithBankTransferDto {
  amount: number;
  currency: string;
  customer_id?: string;
  payment_method_id?: string;
  // Allow extra payment details for bank transfer (v4 charges schema)
  [key: string]: any;
}
