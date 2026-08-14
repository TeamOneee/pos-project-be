import { Prisma, Transaction, TransactionItem } from '@prisma/client';

export type PaymentMethod = 'CASH' | 'CASHLESS_MANUAL';

export interface TransactionItemData {
  productId: string;
  quantity: number;
}

export interface CreateTransactionData {
  outletId: string;
  userId: string;
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  cartId?: string;
  items?: TransactionItemData[];
}

export interface TransactionWithItems {
  transaction: Transaction;
  items: TransactionItem[];
}

export interface TransactionRange {
  start: Date;
  end: Date;
}

export interface TransactionPagination {
  page: number;
  limit: number;
}

/**
 * Public contract yang disediakan Transaction Module untuk module lain.
 *
 * Transaction/Checkout bertanggung jawab mengorchestrasi transaksi dan
 * meminta stock via InventoryPort. Module ini hanya beroperasi pada data
 * yang menjadi ownership-nya (transaction, transaction_item, payment,
 * receipt).
 *
 * Checkout WAJIB menerima idempotency_key (FR-CHK-001) dan payment_method
 * (FR-PAY-001). Semua operasi (transaction + payment + stock + receipt)
 * dikomit atomik dalam satu UnitOfWork sehingga satu checkout attempt
 * menghasilkan paling banyak satu transaksi final (FR-CHK-003, ASM-003).
 */
export interface TransactionPort {
  createTransaction(
    data: CreateTransactionData,
    tx?: Prisma.TransactionClient,
  ): Promise<TransactionWithItems>;

  getById(transactionId: string): Promise<TransactionWithItems | null>;

  listByOutlet(
    outletId: string,
    range?: TransactionRange,
    pagination?: TransactionPagination,
  ): Promise<Transaction[]>;

  listByCashier(
    userId: string,
    range?: TransactionRange,
    pagination?: TransactionPagination,
  ): Promise<Transaction[]>;
}
