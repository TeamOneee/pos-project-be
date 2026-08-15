import { ApiError } from '@app/platform';

/*
 * todo(sales): publish event ini melalui OutboxService dalam transaksi prisma
 * yang sama dengan checkout COMPLETED. payload harus lengkap agar reporting
 * tidak membaca tabel milik sales. api contract 07 masih perlu diselaraskan
 * karena saat ini hanya mendokumentasikan transaction_id + schema_version.
 */
export const TRANSACTION_COMPLETED_EVENT = 'TransactionCompletedEvent';

// menyimpan snapshot satu line checkout yang diperlukan oleh product projection.
export interface TransactionCompletedLineV1 {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  subtotal: string;
}

// menjadi kontrak event v1 yang hanya berasal dari checkout COMPLETED.
export interface TransactionCompletedEventV1 {
  schemaVersion: 1;
  transactionId: string;
  merchantId: string;
  outletId: string;
  status: 'COMPLETED';
  occurredAt: Date;
  merchantTimezone: string;
  total: string;
  lines: TransactionCompletedLineV1[];
}

function requireString(
  payload: Record<string, unknown>,
  field: string,
): string {
  // menolak field string kosong sebelum payload dipakai oleh worker.
  const value = payload[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.validation(`Payload event ${field} tidak valid.`);
  }
  return value;
}

// memvalidasi kontrak event versioned sebelum projection menyentuh database.
export function parseTransactionCompletedEvent(
  payload: Record<string, unknown>,
): TransactionCompletedEventV1 {
  // versi yang tidak dikenal ditolak agar perubahan kontrak tidak salah diproses.
  if (payload.schemaVersion !== 1 || payload.status !== 'COMPLETED') {
    throw ApiError.validation('Payload TransactionCompletedEvent tidak valid.');
  }
  const occurredAt = new Date(requireString(payload, 'occurredAt'));
  if (Number.isNaN(occurredAt.getTime())) {
    throw ApiError.validation('Payload event occurredAt tidak valid.');
  }
  const merchantTimezone = requireString(payload, 'merchantTimezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: merchantTimezone }).format();
  } catch {
    throw ApiError.validation('Payload event merchantTimezone tidak valid.');
  }
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw ApiError.validation('Payload event lines wajib diisi.');
  }
  const lines = payload.lines.map((rawLine, index) => {
    if (!rawLine || typeof rawLine !== 'object') {
      throw ApiError.validation(`Payload event lines[${index}] tidak valid.`);
    }
    const line = rawLine as Record<string, unknown>;
    const quantity = line.quantity;
    if (!Number.isInteger(quantity) || Number(quantity) <= 0) {
      throw ApiError.validation(
        `Payload event lines[${index}].quantity tidak valid.`,
      );
    }
    return {
      productId: requireString(line, 'productId'),
      productNameSnapshot: requireString(line, 'productNameSnapshot'),
      quantity: Number(quantity),
      subtotal: requireString(line, 'subtotal'),
    };
  });

  return {
    schemaVersion: 1,
    transactionId: requireString(payload, 'transactionId'),
    merchantId: requireString(payload, 'merchantId'),
    outletId: requireString(payload, 'outletId'),
    status: 'COMPLETED',
    occurredAt,
    merchantTimezone,
    total: requireString(payload, 'total'),
    lines,
  };
}
