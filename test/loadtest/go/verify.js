// Verifikasi konsistensi DB setelah load test.
// Jalankan: DATABASE_URL=... node test/loadtest/verify.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MERCHANT_ID = 'merchant-load';
const STOCK_PER_PRODUCT = 1000000;

async function main() {
  const failures = [];

  const txCount = await prisma.transaction.count({ where: { merchantId: MERCHANT_ID } });
  const itemAgg = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: { transaction: { merchantId: MERCHANT_ID } },
    _sum: { quantity: true },
  });
  const soldByProduct = new Map(itemAgg.map((r) => [r.productId, r._sum.quantity ?? 0]));

  const invs = await prisma.inventory.findMany({ where: { merchantId: MERCHANT_ID } });
  for (const inv of invs) {
    const sold = soldByProduct.get(inv.productId) ?? 0;
    const expected = STOCK_PER_PRODUCT - sold;
    if (inv.quantity !== expected) {
      failures.push(
        `stok ${inv.productId}: actual=${inv.quantity} expected=${expected} (terjual ${sold})`,
      );
    }
  }

  const dupNumbers = await prisma.$queryRaw`
    SELECT transaction_number, COUNT(*) AS c
    FROM "transaction"
    WHERE merchant_id = ${MERCHANT_ID}
    GROUP BY transaction_number
    HAVING COUNT(*) > 1`;
  if (dupNumbers.length > 0) {
    failures.push(`transaction_number duplikat: ${JSON.stringify(dupNumbers)}`);
  }

  const dupReqIds = await prisma.$queryRaw`
    SELECT checkout_request_id, COUNT(*) AS c
    FROM "transaction"
    WHERE merchant_id = ${MERCHANT_ID}
    GROUP BY checkout_request_id
    HAVING COUNT(*) > 1`;
  if (dupReqIds.length > 0) {
    failures.push(`checkout_request_id duplikat: ${JSON.stringify(dupReqIds)}`);
  }

  const saleMovements = await prisma.stockMovement.aggregate({
    where: { merchantId: MERCHANT_ID, type: 'SALE' },
    _sum: { delta: true },
    _count: true,
  });
  const totalSold = [...soldByProduct.values()].reduce((a, b) => a + b, 0);
  if (-(saleMovements._sum.delta ?? 0) !== totalSold) {
    failures.push(
      `movement SALE total delta=${saleMovements._sum.delta} tidak sama dengan item terjual=${totalSold}`,
    );
  }

  console.log('=== Hasil verifikasi konsistensi ===');
  console.log(`  transaksi        : ${txCount}`);
  console.log(`  item terjual     : ${totalSold}`);
  console.log(`  movement SALE    : ${saleMovements._count} baris (delta total ${saleMovements._sum.delta})`);
  if (failures.length === 0) {
    console.log('  RESULT           : OK — stok, nomor transaksi, dan idempotency konsisten.');
  } else {
    console.log(`  RESULT           : ${failures.length} GAGAL`);
    for (const f of failures) console.log(`    - ${f}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());