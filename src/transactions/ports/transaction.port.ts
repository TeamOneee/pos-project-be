import { Prisma, Transaction, TransactionItem } from '@prisma/client';

export interface TransactionItemData {
  productId: string;
  quantity: number;
}

export interface CreateTransactionData {
  outletId: string;
  userId: string;
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
 * yang menjadi ownership-nya (transaction, transaction_item).
 */
export interface TransactionPort {
  createTransaction(
    data: CreateTransactionData,
    tx?: Prisma.TransactionClient,
  ): Promise<TransactionWithItems>;

  getById(transactionId: string): Promise<TransactionWithItems | null>;

  cancel(transactionId: string): Promise<Transaction>;

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
