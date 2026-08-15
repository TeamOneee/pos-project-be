// Kontrak respons untuk checkout, detail transaksi, dan receipt (07 §5.2/§5.4).
export interface CheckoutLineDto {
  product_id: string;
  name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface PaymentDto {
  method: string;
  amount: string;
  status: string;
}

export interface CashierDto {
  user_id: string;
  name: string;
}

export interface CheckoutResultDto {
  transaction_id: string;
  receipt_number: string;
  status: string;
  outlet_id: string;
  cashier: CashierDto;
  items: CheckoutLineDto[];
  subtotal: string;
  total: string;
  payment: PaymentDto;
  created_at: string;
}

export interface ReceiptDto extends CheckoutResultDto {
  merchant_name: string;
  outlet_name: string;
  outlet_address: string | null;
}

export interface TransactionSummaryDto {
  transaction_id: string;
  receipt_number: string;
  outlet_id: string;
  cashier_name: string;
  total: string;
  status: string;
  created_at: string;
}
