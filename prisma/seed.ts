import { PrismaClient, PaymentMethod, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

const prisma = new PrismaClient();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// ============================================================
// KONFIG RINGKAS - tetap komplit tapi mudah di-tracking
// ============================================================
const SEED_DAYS = 14; // sebelumnya 60 hari -> sekarang 14 hari biar tracking gampang
const INSIGHT_WINDOW_DAYS = 30;

const MERCHANT_ID = 'e7a62c61-4dd2-40b9-b67a-95ce4364c222';
const OWNER_ID = '9faed1df-69cd-4487-a497-8fe78c87b4af';
const ADMIN_ID = '589a73fb-369e-4048-a291-5755738a753c';
const PASSWORD = 'password123';

const OUTLET_PUSAT_ID = 'c28646cf-6886-4a13-ab9a-bc71e08d219f';
const OUTLET_SENAYAN_ID = 'aa4d6277-5f3e-4a22-a4a4-8eb77acca9e2';
const OUTLET_KG_ID = '848c05df-3cfe-4370-a35f-78df0d199573';

const CASHIER_PUSAT_ID = 'dbd0032d-d986-406b-8a60-ac1a7d8cc86a';
const CASHIER_SENAYAN_ID = 'ee15a89a-9616-420c-9730-fd4e9215ca1c';
const CASHIER_KG_ID = 'd9dde9a5-9047-41e7-a463-cbab7a78603c';

const CAT_MAKANAN_ID = 'ad4c2686-6b3c-4ace-80d8-869f62be0af3';
const CAT_MINUMAN_ID = '3d72f782-f707-41e9-8310-35023bd2d8c5';
const CAT_SNACK_ID = '31dfb1c9-66d8-43c6-8476-ad8d4a43910c';
const CAT_DESSERT_ID = '2637805f-814f-4c6f-b270-7fad7ed4bcda';
const CAT_PAKET_ID = 'aad02a13-cf29-4f33-a08d-2c0217444233';
const CAT_MUSIMAN_ID = 'bfb26bf9-fb28-459b-bf5c-4cf0eff12c0f';

const PRODUCT_NASGOR_ID = '2754a878-db67-4602-b245-16ccc1b9a144';
const PRODUCT_MIGORENG_ID = 'f87ff113-6e41-4e21-97f8-d5a565003fd4';
const PRODUCT_AYAM_GEPREK_ID = 'ed99e297-7d15-42ec-af4b-e6735c50ce82';
const PRODUCT_SATE_ID = '3a80bbcd-0080-426a-83be-f30af8dd6b0b';
const PRODUCT_RAWON_ID = '7b782453-66a0-46af-a85b-ef3c91eecb00';
const PRODUCT_BAKSO_ID = '0e2e2299-5571-481f-a065-f7ceb3750625';
const PRODUCT_ESTEH_ID = '566d7c8f-d1b2-4c51-a2e6-3e9a27a918b1';
const PRODUCT_KOP_SUSU_ID = '55f3f810-27eb-4c29-bbdf-07582257ddc8';
const PRODUCT_MATCHA_ID = '5ed83dc6-5930-40a1-b76e-861c87da2c2a';
const PRODUCT_LEMON_ID = '4a1c73db-31c7-43cd-bffe-eccc1c224a05';
const PRODUCT_AIR_ID = '0943a719-d3a8-4c1e-8e38-8c1f7c5d5525';
const PRODUCT_ES_JERUK_ID = '87dad884-8b64-406c-a604-7cec123ae168';
const PRODUCT_PISANG_ID = '5ef96118-1f7e-4eb7-8597-9c5fd475c876';
const PRODUCT_TAHU_ID = 'ae1e482f-c5b9-4d5a-97be-6c82888e942f';
const PRODUCT_UDANG_ID = 'a3347e06-f9e8-4d5a-97c7-3b660fe90776';
const PRODUCT_ES_KRIM_ID = '5d321cd2-baf2-4cc7-851d-52847c94b93a';
const PRODUCT_PUDDING_ID = '4f71af7e-f7a8-4adc-869e-5ad489d4aadb';
const PRODUCT_PAKET_NASGOR_ID = '438d6145-c722-41ae-ba7d-4253410ac3b1';
const PRODUCT_PAKET_AYAM_ID = '87bf5c4a-d5f1-4c0b-99d6-27ec2cc8ac7f';
const PRODUCT_KOLAK_ID = 'e2641c2c-176c-4214-8411-4b0847432f99';

// diperkecil biar tracking enak: total harian ~12-20 transaksi (sebelumnya 21-35)
const OUTLETS = [
  { id: OUTLET_PUSAT_ID, name: 'Cabang Pusat', address: 'Jl. Merdeka No. 1, Jakarta Pusat', cashier: { id: CASHIER_PUSAT_ID, name: 'Budi Santoso', email: 'kasir1@mart.com' }, dailyMin: 5, dailyMax: 8 },
  { id: OUTLET_SENAYAN_ID, name: 'Cabang Senayan', address: 'Jl. Asia Afrika No. 8, Jakarta Selatan', cashier: { id: CASHIER_SENAYAN_ID, name: 'Ani Wijaya', email: 'kasir2@mart.com' }, dailyMin: 3, dailyMax: 5 },
  { id: OUTLET_KG_ID, name: 'Cabang Kelapa Gading', address: 'Jl. Boulevard Barat Raya No. 22, Jakarta Utara', cashier: { id: CASHIER_KG_ID, name: 'Rudi Hartono', email: 'kasir3@mart.com' }, dailyMin: 3, dailyMax: 5 },
];

const CATEGORIES = [
  { id: CAT_MAKANAN_ID, name: 'Makanan Utama', isActive: true },
  { id: CAT_MINUMAN_ID, name: 'Minuman', isActive: true },
  { id: CAT_SNACK_ID, name: 'Snack & Camilan', isActive: true },
  { id: CAT_DESSERT_ID, name: 'Dessert', isActive: true },
  { id: CAT_PAKET_ID, name: 'Paket Hemat', isActive: true },
  { id: CAT_MUSIMAN_ID, name: 'Menu Musiman (Ramadan)', isActive: false },
];

interface SeedProduct { id: string; categoryId: string; name: string; price: number; lowStockThreshold: number; isActive: boolean; weight: number; }
const PRODUCTS: SeedProduct[] = [
  { id: PRODUCT_NASGOR_ID, categoryId: CAT_MAKANAN_ID, name: 'Nasi Goreng Spesial', price: 25000, lowStockThreshold: 10, isActive: true, weight: 8 },
  { id: PRODUCT_MIGORENG_ID, categoryId: CAT_MAKANAN_ID, name: 'Mie Goreng Jawa', price: 22000, lowStockThreshold: 10, isActive: true, weight: 6 },
  { id: PRODUCT_AYAM_GEPREK_ID, categoryId: CAT_MAKANAN_ID, name: 'Ayam Geprek Sambal Bawang', price: 28000, lowStockThreshold: 8, isActive: true, weight: 9 },
  { id: PRODUCT_SATE_ID, categoryId: CAT_MAKANAN_ID, name: 'Sate Ayam (10 Tusuk)', price: 35000, lowStockThreshold: 8, isActive: true, weight: 5 },
  { id: PRODUCT_RAWON_ID, categoryId: CAT_MAKANAN_ID, name: 'Rawon Setan', price: 30000, lowStockThreshold: 8, isActive: true, weight: 4 },
  { id: PRODUCT_BAKSO_ID, categoryId: CAT_MAKANAN_ID, name: 'Bakso Sapi Spesial', price: 20000, lowStockThreshold: 12, isActive: true, weight: 7 },
  { id: PRODUCT_ESTEH_ID, categoryId: CAT_MINUMAN_ID, name: 'Es Teh Manis', price: 5000, lowStockThreshold: 20, isActive: true, weight: 12 },
  { id: PRODUCT_KOP_SUSU_ID, categoryId: CAT_MINUMAN_ID, name: 'Kopi Susu Gula Aren', price: 18000, lowStockThreshold: 15, isActive: true, weight: 11 },
  { id: PRODUCT_MATCHA_ID, categoryId: CAT_MINUMAN_ID, name: 'Matcha Latte', price: 22000, lowStockThreshold: 12, isActive: true, weight: 5 },
  { id: PRODUCT_LEMON_ID, categoryId: CAT_MINUMAN_ID, name: 'Lemon Tea', price: 15000, lowStockThreshold: 15, isActive: true, weight: 8 },
  { id: PRODUCT_AIR_ID, categoryId: CAT_MINUMAN_ID, name: 'Air Mineral', price: 5000, lowStockThreshold: 30, isActive: true, weight: 9 },
  { id: PRODUCT_ES_JERUK_ID, categoryId: CAT_MINUMAN_ID, name: 'Es Jeruk Peras', price: 10000, lowStockThreshold: 20, isActive: true, weight: 7 },
  { id: PRODUCT_PISANG_ID, categoryId: CAT_SNACK_ID, name: 'Pisang Goreng Keju', price: 12000, lowStockThreshold: 15, isActive: true, weight: 6 },
  { id: PRODUCT_TAHU_ID, categoryId: CAT_SNACK_ID, name: 'Tahu Crispy', price: 10000, lowStockThreshold: 15, isActive: true, weight: 5 },
  { id: PRODUCT_UDANG_ID, categoryId: CAT_SNACK_ID, name: 'Udang Goreng Tepung', price: 18000, lowStockThreshold: 10, isActive: true, weight: 4 },
  { id: PRODUCT_ES_KRIM_ID, categoryId: CAT_DESSERT_ID, name: 'Es Krim Vanila', price: 8000, lowStockThreshold: 15, isActive: true, weight: 6 },
  { id: PRODUCT_PUDDING_ID, categoryId: CAT_DESSERT_ID, name: 'Puding Coklat', price: 12000, lowStockThreshold: 10, isActive: true, weight: 5 },
  { id: PRODUCT_PAKET_NASGOR_ID, categoryId: CAT_PAKET_ID, name: 'Paket Nasi Goreng + Es Teh', price: 28000, lowStockThreshold: 8, isActive: true, weight: 6 },
  { id: PRODUCT_PAKET_AYAM_ID, categoryId: CAT_PAKET_ID, name: 'Paket Ayam Geprek + Es Teh', price: 32000, lowStockThreshold: 8, isActive: true, weight: 5 },
  { id: PRODUCT_KOLAK_ID, categoryId: CAT_MUSIMAN_ID, name: 'Kolak Pisang Spesial', price: 15000, lowStockThreshold: 10, isActive: false, weight: 0 },
];

const PRICE_OVERRIDES: Record<string, Record<string, number>> = {
  [OUTLET_SENAYAN_ID]: { [PRODUCT_NASGOR_ID]: 26000, [PRODUCT_KOP_SUSU_ID]: 20000, [PRODUCT_MATCHA_ID]: 24000 },
  [OUTLET_KG_ID]: { [PRODUCT_AYAM_GEPREK_ID]: 30000, [PRODUCT_MATCHA_ID]: 25000 },
};

const OPENING_BASE: Record<string, number> = {
  [PRODUCT_NASGOR_ID]: 120, [PRODUCT_MIGORENG_ID]: 110, [PRODUCT_AYAM_GEPREK_ID]: 120, [PRODUCT_SATE_ID]: 90,
  [PRODUCT_RAWON_ID]: 90, [PRODUCT_BAKSO_ID]: 110, [PRODUCT_ESTEH_ID]: 140, [PRODUCT_KOP_SUSU_ID]: 130,
  [PRODUCT_MATCHA_ID]: 90, [PRODUCT_LEMON_ID]: 110, [PRODUCT_AIR_ID]: 150, [PRODUCT_ES_JERUK_ID]: 110,
  [PRODUCT_PISANG_ID]: 100, [PRODUCT_TAHU_ID]: 90, [PRODUCT_UDANG_ID]: 90, [PRODUCT_ES_KRIM_ID]: 90,
  [PRODUCT_PUDDING_ID]: 90, [PRODUCT_PAKET_NASGOR_ID]: 90, [PRODUCT_PAKET_AYAM_ID]: 90, [PRODUCT_KOLAK_ID]: 0,
};

const FORCE_LOW_STOCK = [
  { outletId: OUTLET_KG_ID, productId: PRODUCT_UDANG_ID, final: 2, reason: 'Koreksi stok opname: barang tidak layak jual' },
  { outletId: OUTLET_KG_ID, productId: PRODUCT_ES_KRIM_ID, final: 0, reason: 'Koreksi stok opname: stok habis' },
  { outletId: OUTLET_SENAYAN_ID, productId: PRODUCT_TAHU_ID, final: 1, reason: 'Koreksi stok opname' },
  { outletId: OUTLET_PUSAT_ID, productId: PRODUCT_PISANG_ID, final: 3, reason: 'Koreksi stok opname: produk rusak' },
];

const THRESHOLD_OVERRIDES = [
  { outletId: OUTLET_PUSAT_ID, productId: PRODUCT_NASGOR_ID, value: 15 },
  { outletId: OUTLET_SENAYAN_ID, productId: PRODUCT_ESTEH_ID, value: 25 },
  { outletId: OUTLET_KG_ID, productId: PRODUCT_AIR_ID, value: 40 },
];

// ============================================================
// UTIL WAKTU WIB (UTC+7)
// ============================================================
const DAY_MS = 86_400_000;
const TZ_OFFSET_H = 7;

function wibDateParts(dayOffset: number): { y: number; m: number; d: number; dow: number } {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - dayOffset * DAY_MS);
  return { y: utcMidnight.getUTCFullYear(), m: utcMidnight.getUTCMonth() + 1, d: utcMidnight.getUTCDate(), dow: utcMidnight.getUTCDay() };
}
function wibAt(parts: { y: number; m: number; d: number }, hour: number, minute: number, second = 0, ms = 0): Date {
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d, hour - TZ_OFFSET_H, minute, second, ms));
}
function dateKey(parts: { y: number; m: number; d: number }): string {
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
function weightedPick<T>(pool: T[]): T { return pool[randInt(0, pool.length - 1)]; }
function weightedChoice<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  for (const it of items) { roll -= it.weight; if (roll <= 0) return it.value; }
  return items[items.length - 1].value;
}
const fmt = (n: number) => n.toFixed(2);
const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

async function main() {
  console.log(`🌱 Seeding ringkas ${SEED_DAYS} hari (insight window 30 hari) ...`);
  const passwordHash = await argon2.hash(PASSWORD);
  const year = new Date().getUTCFullYear();

  await prisma.$executeRawUnsafe(`
    DO $BODY$ BEGIN
      IF to_regclass('merchant') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'merchant_owner_user_id_fkey' AND condeferrable
      ) THEN
        ALTER TABLE "merchant" DROP CONSTRAINT IF EXISTS "merchant_owner_user_id_fkey";
        ALTER TABLE "merchant" ADD CONSTRAINT "merchant_owner_user_id_fkey"
          FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $BODY$;
  `);

  // ---- 1. IDENTITY ----
  let owner = await prisma.user.findUnique({ where: { email: 'owner@mart.com' } });
  if (!owner) {
    await prisma.$transaction(async (tx) => {
      await tx.merchant.create({ data: { id: MERCHANT_ID, ownerUserId: OWNER_ID, name: 'Toko Sukses Sejahtera', timezone: 'Asia/Jakarta', status: 'ACTIVE' } });
      await tx.user.create({ data: { id: OWNER_ID, merchantId: MERCHANT_ID, name: 'John Doe', email: 'owner@mart.com', passwordHash, role: 'OWNER', status: 'ACTIVE' } });
    });
    owner = (await prisma.user.findUnique({ where: { email: 'owner@mart.com' } }))!;
  } else {
    await prisma.merchant.upsert({
      where: { id: MERCHANT_ID },
      update: { ownerUserId: owner.id, name: 'Toko Sukses Sejahtera', timezone: 'Asia/Jakarta', status: 'ACTIVE' },
      create: { id: MERCHANT_ID, ownerUserId: owner.id, name: 'Toko Sukses Sejahtera', timezone: 'Asia/Jakarta', status: 'ACTIVE' },
    });
    await prisma.user.update({ where: { id: owner.id }, data: { name: 'John Doe', passwordHash, role: 'OWNER', status: 'ACTIVE', outletId: null } });
  }
  console.log('✅ Merchant & Owner');

  await prisma.user.upsert({
    where: { email: 'admin@mart.com' },
    update: { name: 'Sari Dewi', passwordHash, role: 'ADMIN', status: 'ACTIVE', outletId: null },
    create: { id: ADMIN_ID, merchantId: MERCHANT_ID, name: 'Sari Dewi', email: 'admin@mart.com', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
  });
  for (const o of OUTLETS) {
    await prisma.outlet.upsert({
      where: { id_merchantId: { id: o.id, merchantId: MERCHANT_ID } },
      update: { name: o.name, address: o.address, status: 'ACTIVE' },
      create: { id: o.id, merchantId: MERCHANT_ID, name: o.name, address: o.address, status: 'ACTIVE' },
    });
    await prisma.user.upsert({
      where: { email: o.cashier.email },
      update: { name: o.cashier.name, outletId: o.id, role: 'CASHIER', status: 'ACTIVE', passwordHash },
      create: { id: o.cashier.id, merchantId: MERCHANT_ID, outletId: o.id, name: o.cashier.name, email: o.cashier.email, passwordHash, role: 'CASHIER', status: 'ACTIVE' },
    });
  }
  console.log('✅ Outlets & Cashiers (3 outlet, 3 kasir + owner + admin)');

  // ---- 2. CATALOG ----
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id_merchantId: { id: cat.id, merchantId: MERCHANT_ID } },
      update: { name: cat.name, isActive: cat.isActive },
      create: { id: cat.id, merchantId: MERCHANT_ID, name: cat.name, isActive: cat.isActive },
    });
  }
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { id_merchantId: { id: p.id, merchantId: MERCHANT_ID } },
      update: { categoryId: p.categoryId, name: p.name, price: new Prisma.Decimal(p.price), lowStockThreshold: p.lowStockThreshold, isActive: p.isActive },
      create: { id: p.id, merchantId: MERCHANT_ID, categoryId: p.categoryId, name: p.name, price: new Prisma.Decimal(p.price), lowStockThreshold: p.lowStockThreshold, isActive: p.isActive },
    });
  }
  await prisma.productOutletPrice.deleteMany({ where: { merchantId: MERCHANT_ID } });
  const outletPrices: Prisma.ProductOutletPriceCreateManyInput[] = [];
  for (const [outletId, byProduct] of Object.entries(PRICE_OVERRIDES)) {
    for (const [productId, price] of Object.entries(byProduct)) outletPrices.push({ merchantId: MERCHANT_ID, outletId, productId, price: new Prisma.Decimal(price) });
  }
  if (outletPrices.length) await prisma.productOutletPrice.createMany({ data: outletPrices });
  console.log('✅ Catalog (6 kategori, 20 produk, override harga)');

  // ---- 3. RESET DERIVED ----
  await prisma.transactionItem.deleteMany({ where: { transaction: { merchantId: MERCHANT_ID } } });
  await prisma.transaction.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.stockMovement.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.aiInsight.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.aiAnalysisJob.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.inventory.deleteMany({ where: { merchantId: MERCHANT_ID } });

  const effectivePrice = (outletId: string, productId: string): number => PRICE_OVERRIDES[outletId]?.[productId] ?? PRODUCTS.find((p) => p.id === productId)!.price;
  const productName = (productId: string): string => PRODUCTS.find((p) => p.id === productId)!.name;

  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const items: Prisma.TransactionItemCreateManyInput[] = [];
  const movements: Prisma.StockMovementCreateManyInput[] = [];

  const running = new Map<string, number>();
  const rk = (outletId: string, productId: string) => `${outletId}:${productId}`;
  let seq = 0, itemSeq = 0, movementSeq = 0;

  const pushAdj = (outletId: string, productId: string, delta: number, reason: string, actorUserId: string, at: Date) => {
    const k = rk(outletId, productId);
    const before = running.get(k) ?? 0;
    const after = before + delta;
    running.set(k, after);
    movementSeq += 1;
    movements.push({ id: `seed-mv-${String(movementSeq).padStart(6, '0')}`, merchantId: MERCHANT_ID, outletId, productId, type: 'ADJUSTMENT', delta, quantityBefore: before, quantityAfter: after, reason, transactionId: null, actorUserId, createdAt: at });
  };

  // stok awal (hari SEED_DAYS yang lalu jam 07:00 WIB)
  for (const o of OUTLETS) {
    for (const p of PRODUCTS) {
      const opening = OPENING_BASE[p.id] + randInt(0, 10);
      const start = wibAt(wibDateParts(SEED_DAYS), 7, 0, 0);
      pushAdj(o.id, p.id, opening, 'Saldo awal stok (opname pembukaan)', ADMIN_ID, start);
    }
  }

  const salePool = PRODUCTS.filter((p) => p.isActive).map((p) => ({ productId: p.id, weight: p.weight }));
  const HOUR_POOL = [10, 11, 11, 12, 12, 12, 13, 13, 14, 18, 18, 19, 19, 19, 20, 20, 21];
  const PAYMENT_METHODS: Array<{ value: PaymentMethod; weight: number }> = [{ value: 'CASH', weight: 50 }, { value: 'QRIS', weight: 35 }, { value: 'TRANSFER', weight: 15 }];

  const insightAgg = {
    totalOmzet: 0, transactionCount: 0,
    daily: new Map<string, { omzet: number; count: number }>(),
    byOutlet: new Map<string, { outletId: string; outletName: string; omzet: number; count: number }>(),
    byProduct: new Map<string, { productId: string; name: string; units: number; omzet: number }>(),
    byHour: new Map<number, { omzet: number; count: number }>(),
  };
  const todayParts = wibDateParts(0);
  const windowStart = wibAt(wibDateParts(INSIGHT_WINDOW_DAYS - 1), 0, 0, 0, 0);

  for (let dayOffset = SEED_DAYS; dayOffset >= 1; dayOffset -= 1) {
    const dayParts = wibDateParts(dayOffset);
    const weekend = dayParts.dow === 0 || dayParts.dow === 6 ? 1.3 : 1;
    for (const outlet of OUTLETS) {
      const count = Math.round(randInt(outlet.dailyMin, outlet.dailyMax) * weekend);
      // restok tiap 4 hari biar stok tidak habis total
      if (dayOffset % 4 === 0) {
        const topFour = [...salePool].sort((a, b) => b.weight - a.weight).slice(0, 3);
        const restockAt = wibAt(dayParts, 7, randInt(0, 59), randInt(0, 59));
        for (const it of topFour) {
          pushAdj(outlet.id, it.productId, randInt(15, 25), Math.random() < 0.5 ? 'Terima barang dari supplier' : 'Restok harian', ADMIN_ID, restockAt);
        }
      }
      for (let i = 0; i < count; i += 1) {
        seq += 1;
        const tid = `seed-txn-${String(seq).padStart(6, '0')}`;
        const hour = weightedPick(HOUR_POOL);
        const paidAt = wibAt(dayParts, hour, randInt(0, 59), randInt(0, 59));
        const lineCount = weightedChoice([{ value: 1, weight: 50 }, { value: 2, weight: 35 }, { value: 3, weight: 15 }]);
        const picked: Array<{ productId: string; quantity: number }> = [];
        for (let attempt = 0; attempt < lineCount && picked.length < lineCount; attempt += 1) {
          const cand = weightedPick(salePool);
          const avail = running.get(rk(outlet.id, cand.productId)) ?? 0;
          if (avail <= 0) continue;
          const qty = Math.min(weightedChoice([{ value: 1, weight: 70 }, { value: 2, weight: 25 }, { value: 3, weight: 5 }]), avail);
          const ex = picked.find((p) => p.productId === cand.productId);
          if (ex) ex.quantity += qty; else picked.push({ productId: cand.productId, quantity: qty });
        }
        if (picked.length === 0) continue;

        // FIX: hitung subtotal per-line dengan harga outlet yang benar
        let subTotal = 0;
        for (const line of picked) subTotal += effectivePrice(outlet.id, line.productId) * line.quantity;

        const paymentMethod = weightedChoice(PAYMENT_METHODS);
        const operatorUserId = Math.random() < 0.85 ? outlet.cashier.id : owner!.id;

        transactions.push({
          id: tid, merchantId: MERCHANT_ID, outletId: outlet.id, operatorUserId,
          transactionNumber: `INV-${year}-${String(seq).padStart(6, '0')}`, status: 'COMPLETED', paymentMethod, paymentStatus: 'CONFIRMED',
          paidAt, createdAt: paidAt, checkoutRequestId: `seed-checkout-${String(seq).padStart(6, '0')}`, requestHash: sha256(`seed:${seq}`),
          subtotal: new Prisma.Decimal(subTotal), total: new Prisma.Decimal(subTotal),
        });
        for (const line of picked) {
          itemSeq += 1;
          const lp = effectivePrice(outlet.id, line.productId);
          items.push({ id: `seed-item-${String(itemSeq).padStart(6, '0')}`, transactionId: tid, productId: line.productId, productNameSnapshot: productName(line.productId), quantity: line.quantity, unitPriceSnapshot: new Prisma.Decimal(lp), subtotal: new Prisma.Decimal(lp * line.quantity) });
          const k = rk(outlet.id, line.productId);
          const before = running.get(k) ?? 0;
          const after = before - line.quantity;
          running.set(k, after);
          movementSeq += 1;
          movements.push({ id: `seed-mv-${String(movementSeq).padStart(6, '0')}`, merchantId: MERCHANT_ID, outletId: outlet.id, productId: line.productId, type: 'SALE', delta: -line.quantity, quantityBefore: before, quantityAfter: after, reason: null, transactionId: tid, actorUserId: operatorUserId, createdAt: paidAt });
        }
        // agregasi insight (30 hari terakhir)
        if (paidAt >= windowStart) {
          insightAgg.totalOmzet += subTotal;
          insightAgg.transactionCount += 1;
          const dk = dateKey(dayParts);
          const d = insightAgg.daily.get(dk) ?? { omzet: 0, count: 0 };
          d.omzet += subTotal; d.count += 1; insightAgg.daily.set(dk, d);
          const oa = insightAgg.byOutlet.get(outlet.id) ?? { outletId: outlet.id, outletName: outlet.name, omzet: 0, count: 0 };
          oa.omzet += subTotal; oa.count += 1; insightAgg.byOutlet.set(outlet.id, oa);
          const ha = insightAgg.byHour.get(hour) ?? { omzet: 0, count: 0 };
          ha.omzet += subTotal; ha.count += 1; insightAgg.byHour.set(hour, ha);
          for (const line of picked) {
            const pr = insightAgg.byProduct.get(line.productId) ?? { productId: line.productId, name: productName(line.productId), units: 0, omzet: 0 };
            pr.units += line.quantity; pr.omzet += effectivePrice(outlet.id, line.productId) * line.quantity;
            insightAgg.byProduct.set(line.productId, pr);
          }
        }
      }
    }
  }

  for (const it of FORCE_LOW_STOCK) {
    const k = rk(it.outletId, it.productId);
    const before = running.get(k) ?? 0;
    const delta = it.final - before;
    if (delta !== 0) pushAdj(it.outletId, it.productId, delta, it.reason, ADMIN_ID, wibAt(todayParts, 8, 0, 0));
  }

  console.log(`✅ Generated ${transactions.length} transaksi, ${items.length} item, ${movements.length} movement (periode ${SEED_DAYS} hari)`);

  await prisma.transaction.createMany({ data: transactions });
  await prisma.transactionItem.createMany({ data: items });
  await prisma.stockMovement.createMany({ data: movements });

  // ---- 5. INVENTORY ----
  const inventory: Prisma.InventoryCreateManyInput[] = [];
  for (const o of OUTLETS) for (const p of PRODUCTS) {
    const quantity = running.get(rk(o.id, p.id)) ?? 0;
    const ov = THRESHOLD_OVERRIDES.find((x) => x.outletId === o.id && x.productId === p.id);
    inventory.push({ merchantId: MERCHANT_ID, outletId: o.id, productId: p.id, quantity, lowStockThresholdOverride: ov?.value ?? null });
  }
  await prisma.inventory.createMany({ data: inventory });
  console.log('✅ Inventory');

  await prisma.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS "transaction_number_seq" START 1;');
  if (seq > 0) await prisma.$executeRawUnsafe(`SELECT setval('transaction_number_seq', ${seq}, true)`);

  // ---- 6. AI JOBS & INSIGHTS (wajib agar dashboard insight FE tidak 404) ----
  for (let off = 0; off < 3; off += 1) { // cukup 3 job terakhir
    const parts = wibDateParts(off);
    const analysisDate = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
    await prisma.aiAnalysisJob.create({ data: { merchantId: MERCHANT_ID, analysisDate, state: 'READY', attempts: 1, nextRetryAt: null, errorCategory: null } });
  }
  const windowEnd = wibAt(todayParts, 23, 59, 59, 999);
  const generatedAt = wibAt(todayParts, 8, 30, 0, 0);
  const dataVersion = `v1:${generatedAt.toISOString()}`;
  const avgValue = insightAgg.transactionCount > 0 ? insightAgg.totalOmzet / insightAgg.transactionCount : 0;

  const dailySeries = Array.from(insightAgg.daily.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([day, agg]) => ({
    bucket_start: day, omzet: fmt(agg.omzet), transaction_count: agg.count, average_transaction_value: fmt(agg.omzet / agg.count),
  }));
  const aovSeries = dailySeries.map((p) => ({ bucket_start: p.bucket_start, average_transaction_value: p.average_transaction_value }));
  const topProducts = Array.from(insightAgg.byProduct.values()).sort((a, b) => b.units - a.units).slice(0, 5).map((p) => ({ productId: p.productId, name: p.name, unitsSold: p.units, omzet: fmt(p.omzet) }));
  const leastProducts = Array.from(insightAgg.byProduct.values()).filter((p) => p.units > 0).sort((a, b) => a.units - b.units).slice(0, 5).map((p) => ({ productId: p.productId, name: p.name, unitsSold: p.units, omzet: fmt(p.omzet) }));
  const outletComparison = Array.from(insightAgg.byOutlet.values()).map((o) => ({ outletId: o.outletId, outletName: o.outletName, omzet: fmt(o.omzet), transactionCount: o.count }));
  const hours = Array.from(insightAgg.byHour.entries()).sort((a, b) => a[0] - b[0]).map(([hourOfDay, agg]) => ({ hourOfDay, omzet: fmt(agg.omzet), transactionCount: agg.count }));

  const topProduct = topProducts[0];
  const bestOutlet = [...outletComparison].sort((a, b) => Number(b.omzet) - Number(a.omzet))[0];
  const busyHours = [...hours].sort((a, b) => b.transactionCount - a.transactionCount);
  const lunch = busyHours.find((h) => h.hourOfDay >= 11 && h.hourOfDay <= 14);
  const dinner = busyHours.find((h) => h.hourOfDay >= 18 && h.hourOfDay <= 21);

  const insights: Prisma.AiInsightCreateManyInput[] = [
    {
      merchantId: MERCHANT_ID, type: 'SALES_TREND', title: 'Tren penjualan Merchant',
      content: `Selama ${INSIGHT_WINDOW_DAYS} hari terakhir, Toko Sukses Sejahtera mencatat omzet ${rupiah(insightAgg.totalOmzet)} dari ${insightAgg.transactionCount} transaksi dengan nilai rata-rata ${rupiah(Math.round(avgValue))} per transaksi. Volume meningkat di akhir pekan — peluang promosi hari kerja.`,
      evidenceSummary: { schema_version: 1, type: 'SALES_TREND', payload: { total_omzet: fmt(insightAgg.totalOmzet), transaction_count: insightAgg.transactionCount, average_transaction_value: fmt(avgValue), trend: dailySeries } },
      status: 'READY', periodStart: windowStart, periodEnd: windowEnd, dataVersion, generatedAt,
    },
    {
      merchantId: MERCHANT_ID, type: 'AOV_TREND', title: 'Tren nilai rata-rata transaksi',
      content: `Nilai rata-rata transaksi ${INSIGHT_WINDOW_DAYS} hari terakhir adalah ${rupiah(Math.round(avgValue))}. Tren AOV fluktuatif namun stabil di kisaran ${rupiah(Math.round(avgValue * 0.8))}–${rupiah(Math.round(avgValue * 1.2))}, indikasi bundling paket diterima pelanggan.`,
      evidenceSummary: { schema_version: 1, type: 'AOV_TREND', payload: { average_transaction_value: fmt(avgValue), trend: aovSeries } },
      status: 'READY', periodStart: windowStart, periodEnd: windowEnd, dataVersion, generatedAt,
    },
    {
      merchantId: MERCHANT_ID, type: 'OUTLET_COMPARISON', title: 'Perbandingan performa Outlet',
      content: `${bestOutlet?.outletName ?? 'Cabang Pusat'} memimpin dengan omzet ${rupiah(Number(bestOutlet?.omzet ?? 0))} dari ${bestOutlet?.transactionCount ?? 0} transaksi. Outlet lain dapat mengejar dengan penyesuaian menu dan jam operasional.`,
      evidenceSummary: { schema_version: 1, type: 'OUTLET_COMPARISON', payload: { outlets: outletComparison } },
      status: 'READY', periodStart: windowStart, periodEnd: windowEnd, dataVersion, generatedAt,
    },
    {
      merchantId: MERCHANT_ID, type: 'TOP_PRODUCTS', title: 'Produk terlaris dan kurang laku',
      content: `Produk paling laris adalah ${topProduct?.name ?? '-'} dengan ${topProduct?.unitsSold ?? 0} unit terjual senilai ${rupiah(Number(topProduct?.omzet ?? 0))}. Pertimbangkan restok rutin dan promosi silang untuk produk kurang laku.`,
      evidenceSummary: { schema_version: 1, type: 'TOP_PRODUCTS', payload: { top_selling: topProducts, least_selling: leastProducts } },
      status: 'READY', periodStart: windowStart, periodEnd: windowEnd, dataVersion, generatedAt,
    },
    {
      merchantId: MERCHANT_ID, type: 'TIME_PATTERN', title: 'Pola waktu penjualan',
      content: `Jam tersibuk pada sesi ${lunch ? `siang (${lunch.hourOfDay}.00, ${lunch.transactionCount} trx)` : '-'} dan ${dinner ? `malam (${dinner.hourOfDay}.00, ${dinner.transactionCount} trx)` : '-'}. Tambah staf kasir di jam tersebut untuk percepat layanan.`,
      evidenceSummary: { schema_version: 1, type: 'TIME_PATTERN', payload: { hours } },
      status: 'READY', periodStart: windowStart, periodEnd: windowEnd, dataVersion, generatedAt,
    },
  ];
  await prisma.aiInsight.createMany({ data: insights });
  console.log('✅ AI Jobs (3) & Insights (5) — dashboard insight siap diakses owner');

  const summary = await Promise.all([
    prisma.user.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.outlet.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.category.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.product.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.inventory.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.stockMovement.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.transaction.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.transactionItem.count({ where: { transaction: { merchantId: MERCHANT_ID } } }),
    prisma.aiAnalysisJob.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.aiInsight.count({ where: { merchantId: MERCHANT_ID } }),
  ]);
  const [users, outlets, categories, products, invCount, movCount, txns, itemCount, jobs, insightsCount] = summary;
  console.log('🎉 Seeding ringkas selesai — mudah di-tracking');
  console.log('────────────────────────────────────────────');
  console.log(`   Periode         : ${SEED_DAYS} hari terakhir (insight window 30 hari)`);
  console.log(`   Merchant        : 1 (Toko Sukses Sejahtera)`);
  console.log(`   User            : ${users} (owner/admin/3 kasir)`);
  console.log(`   Outlet          : ${outlets}`);
  console.log(`   Category        : ${categories}`);
  console.log(`   Product         : ${products}`);
  console.log(`   Inventory       : ${invCount}`);
  console.log(`   Stock movement  : ${movCount}`);
  console.log(`   Transaction     : ${txns}`);
  console.log(`   Transaction item: ${itemCount}`);
  console.log(`   AI job/insight  : ${jobs}/${insightsCount}`);
  console.log('────────────────────────────────────────────');
  console.log('🔑 Akun demo (password: password123):');
  console.log('   OWNER  : owner@mart.com');
  console.log('   ADMIN  : admin@mart.com');
  for (const o of OUTLETS) console.log(`   CASHIER: ${o.cashier.email} (${o.name})`);
}

main().catch((e) => { console.error('❌ Seeding failed:'); console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
