// Verifikasi konsistensi DB setelah skenario multi-aktor (k6).
// Jalankan: DATABASE_URL=... N_MERCHANTS=500 node test/loadtest/scenario/verify.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const N = Number(process.env.N_MERCHANTS || 500);
const PRODUCTS_PER_MERCHANT = 5;
const STOCK_PER_PRODUCT = 100000;
const padHex = (n, w) => n.toString(16).padStart(w, '0');
const uuid = (prefix, n) => `${prefix}-0000-4000-8000-${padHex(n, 12)}`;
const merchantId = (i) => uuid('00000000', i);
const outletId = (i, o) => uuid(o === 0 ? '10000000' : '20000000', i);
const productId = (i, j) => uuid('30000000', i * PRODUCTS_PER_MERCHANT + j);

async function main() {
  let failed = false;
  const report = (ok, msg) => {
    console.log(`${ok ? '  OK ' : '  FAIL'} ${msg}`);
    if (!ok) failed = true;
  };

  const expectedTxns = N * 2;
  const txns = await prisma.transaction.findMany({
    select: { transactionNumber: true, checkoutRequestId: true, status: true },
  });
  const tolerance = Math.ceil(expectedTxns * 0.01);
  report(
    Math.abs(txns.length - expectedTxns) <= tolerance,
    `jumlah transaksi = ${txns.length} (expected ${expectedTxns} ±${tolerance})`,
  );

  const numSet = new Set();
  let dupNumbers = 0;
  for (const t of txns) {
    if (numSet.has(t.transactionNumber)) dupNumbers += 1;
    numSet.add(t.transactionNumber);
  }
  report(dupNumbers === 0, `tidak ada transaction_number kembar (${dupNumbers} duplikat)`);

  const reqSet = new Set();
  let dupReq = 0;
  for (const t of txns) {
    if (reqSet.has(t.checkoutRequestId)) dupReq += 1;
    reqSet.add(t.checkoutRequestId);
  }
  report(dupReq === 0, `tidak ada checkout_request_id kembar (${dupReq} duplikat)`);

  const notCompleted = txns.filter((t) => t.status !== 'COMPLETED').length;
  report(notCompleted === 0, `semua transaksi COMPLETED (${notCompleted} tidak)`);

  let sampleOk = true;
  const sampleCount = Math.min(10, N);
  for (let i = 0; i < sampleCount; i += 1) {
    const mId = merchantId(i);
    const oId = outletId(i, 0);
    const pId = productId(i, 0);
    const inv = await prisma.inventory.findFirst({ where: { merchantId: mId, outletId: oId, productId: pId } });
    const agg = await prisma.stockMovement.aggregate({
      where: { merchantId: mId, outletId: oId, productId: pId, type: 'SALE' },
      _sum: { delta: true },
    });
    const expected = STOCK_PER_PRODUCT + (agg._sum.delta ?? 0);
    if (Number(inv.quantity) !== expected) {
      sampleOk = false;
      console.error(`  merchant ${i}: inventory=${inv.quantity}, expected=${expected} (delta SALE ${agg._sum.delta})`);
    }
  }
  report(sampleOk, `konsistensi stok sampel ${sampleCount} merchant (stok = awal + delta SALE)`);

  console.log(failed ? '\nVERIFIKASI GAGAL.' : '\nVERIFIKASI LULUS.');
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());