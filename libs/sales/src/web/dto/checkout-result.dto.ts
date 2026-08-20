// Kontrak respons untuk checkout, detail transaksi, dan receipt (07 §5.2/§5.4).
export interface CheckoutLineDto {
  product_id: string;
  name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface OperatorDto {
  user_id: string;
  role: string;
  name: string;
}

// PaymentInfo adalah atribut pada Transaction (OD-001) — tidak ada entitas Payment.
export interface PaymentDto {
  method: string;
  status: string;
  paid_at: string;
}

export interface CheckoutResultDto {
  transaction_id: string;
  transaction_number: string;
  status: string;
  outlet_id: string;
  operator: OperatorDto;
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
  transaction_number: string;
  outlet_id: string;
  operator_name: string;
  total: string;
  status: string;
  created_at: string;
}
