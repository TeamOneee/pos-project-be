import { PrismaClient, PaymentMethod, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

// ============================================================
// IDENTITAS DEMO
// ============================================================
const MERCHANT_ID = 'merchant-toko-sukses-001';
const OWNER_ID = 'user-owner-001';
const ADMIN_ID = 'user-admin-001';
const PASSWORD = 'password123';

const OUTLETS = [
  {
    id: 'outlet-pusat-001',
    name: 'Cabang Pusat',
    address: 'Jl. Merdeka No. 1, Jakarta Pusat',
    cashier: {
      id: 'user-cashier-001',
      name: 'Cici Cashier',
      email: 'cashier@sukses.com',
    },
    dailyMin: 10,
    dailyMax: 16,
  },
  {
    id: 'outlet-senayan-001',
    name: 'Cabang Senayan',
    address: 'Jl. Asia Afrika No. 8, Jakarta Selatan',
    cashier: {
      id: 'user-cashier-002',
      name: 'Dedi Cashier',
      email: 'cashier-senayan@sukses.com',
    },
    dailyMin: 6,
    dailyMax: 10,
  },
  {
    id: 'outlet-kelapa-gading-001',
    name: 'Cabang Kelapa Gading',
    address: 'Jl. Boulevard Barat Raya No. 22, Jakarta Utara',
    cashier: {
      id: 'user-cashier-003',
      name: 'Eka Cashier',
      email: 'cashier-kg@sukses.com',
    },
    dailyMin: 5,
    dailyMax: 9,
  },
];

const CATEGORIES = [
  { id: 'cat-makanan', name: 'Makanan Utama', isActive: true },
  { id: 'cat-minuman', name: 'Minuman', isActive: true },
  { id: 'cat-snack', name: 'Snack & Camilan', isActive: true },
  { id: 'cat-dessert', name: 'Dessert', isActive: true },
  { id: 'cat-paket', name: 'Paket Hemat', isActive: true },
  // menu musiman yang sudah nonaktif -> tampil pada dashboard operasional
  { id: 'cat-musiman', name: 'Menu Musiman (Ramadan)', isActive: false },
];

interface SeedProduct {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  lowStockThreshold: number;
  isActive: boolean;
  weight: number; // bobot popularitas untuk simulasi penjualan
}

const PRODUCTS: SeedProduct[] = [
  {
    id: 'prod-nasgor',
    categoryId: 'cat-makanan',
    name: 'Nasi Goreng Spesial',
    price: 25000,
    lowStockThreshold: 10,
    isActive: true,
    weight: 8,
  },
  {
    id: 'prod-migoreng',
    categoryId: 'cat-makanan',
    name: 'Mie Goreng Jawa',
    price: 22000,
    lowStockThreshold: 10,
    isActive: true,
    weight: 6,
  },
  {
    id: 'prod-ayam-geprek',
    categoryId: 'cat-makanan',
    name: 'Ayam Geprek Sambal Bawang',
    price: 28000,
    lowStockThreshold: 8,
    isActive: true,
    weight: 9,
  },
  {
    id: 'prod-sate',
    categoryId: 'cat-makanan',
    name: 'Sate Ayam (10 Tusuk)',
    price: 35000,
    lowStockThreshold: 8,
    isActive: true,
    weight: 5,
  },
  {
    id: 'prod-rawon',
    categoryId: 'cat-makanan',
    name: 'Rawon Setan',
    price: 30000,
    lowStockThreshold: 8,
    isActive: true,
    weight: 4,
  },
  {
    id: 'prod-bakso',
    categoryId: 'cat-makanan',
    name: 'Bakso Sapi Spesial',
    price: 20000,
    lowStockThreshold: 12,
    isActive: true,
    weight: 7,
  },
  {
    id: 'prod-esteh',
    categoryId: 'cat-minuman',
    name: 'Es Teh Manis',
    price: 5000,
    lowStockThreshold: 20,
    isActive: true,
    weight: 12,
  },
  {
    id: 'prod-kop-susu',
    categoryId: 'cat-minuman',
    name: 'Kopi Susu Gula Aren',
    price: 18000,
    lowStockThreshold: 15,
    isActive: true,
    weight: 11,
  },
  {
    id: 'prod-matcha',
    categoryId: 'cat-minuman',
    name: 'Matcha Latte',
    price: 22000,
    lowStockThreshold: 12,
    isActive: true,
    weight: 5,
  },
  {
    id: 'prod-lemon',
    categoryId: 'cat-minuman',
    name: 'Lemon Tea',
    price: 15000,
    lowStockThreshold: 15,
    isActive: true,
    weight: 8,
  },
  {
    id: 'prod-air',
    categoryId: 'cat-minuman',
    name: 'Air Mineral',
    price: 5000,
    lowStockThreshold: 30,
    isActive: true,
    weight: 9,
  },
  {
    id: 'prod-es-jeruk',
    categoryId: 'cat-minuman',
    name: 'Es Jeruk Peras',
    price: 10000,
    lowStockThreshold: 20,
    isActive: true,
    weight: 7,
  },
  {
    id: 'prod-pisang',
    categoryId: 'cat-snack',
    name: 'Pisang Goreng Keju',
    price: 12000,
    lowStockThreshold: 15,
    isActive: true,
    weight: 6,
  },
  {
    id: 'prod-tahu',
    categoryId: 'cat-snack',
    name: 'Tahu Crispy',
    price: 10000,
    lowStockThreshold: 15,
    isActive: true,
    weight: 5,
  },
  {
    id: 'prod-udang',
    categoryId: 'cat-snack',
    name: 'Udang Goreng Tepung',
    price: 18000,
    lowStockThreshold: 10,
    isActive: true,
    weight: 4,
  },
  {
    id: 'prod-es-krim',
    categoryId: 'cat-dessert',
    name: 'Es Krim Vanila',
    price: 8000,
    lowStockThreshold: 15,
    isActive: true,
    weight: 6,
  },
  {
    id: 'prod-pudding',
    categoryId: 'cat-dessert',
    name: 'Puding Coklat',
    price: 12000,
    lowStockThreshold: 10,
    isActive: true,
    weight: 5,
  },
  {
    id: 'prod-paket-nasgor',
    categoryId: 'cat-paket',
    name: 'Paket Nasi Goreng + Es Teh',
    price: 28000,
    lowStockThreshold: 8,
    isActive: true,
    weight: 6,
  },
  {
    id: 'prod-paket-ayam',
    categoryId: 'cat-paket',
    name: 'Paket Ayam Geprek + Es Teh',
    price: 32000,
    lowStockThreshold: 8,
    isActive: true,
    weight: 5,
  },
  {
    id: 'prod-kolak',
    categoryId: 'cat-musiman',
    name: 'Kolak Pisang Spesial',
    price: 15000,
    lowStockThreshold: 10,
    isActive: false,
    weight: 0,
  },
];

// harga override per outlet (FR-CAT-010 / DG-002)
const PRICE_OVERRIDES: Record<string, Record<string, number>> = {
  'outlet-senayan-001': {
    'prod-nasgor': 26000,
    'prod-kop-susu': 20000,
    'prod-matcha': 24000,
  },
  'outlet-kelapa-gading-001': {
    'prod-ayam-geprek': 30000,
    'prod-matcha': 25000,
  },
};

// stok awal (saldo opname pembukaan) per produk
const OPENING_BASE: Record<string, number> = {
  'prod-nasgor': 230,
  'prod-migoreng': 220,
  'prod-ayam-geprek': 240,
  'prod-sate': 190,
  'prod-rawon': 180,
  'prod-bakso': 210,
  'prod-esteh': 260,
  'prod-kop-susu': 250,
  'prod-matcha': 190,
  'prod-lemon': 210,
  'prod-air': 280,
  'prod-es-jeruk': 220,
  'prod-pisang': 200,
  'prod-tahu': 190,
  'prod-udang': 180,
  'prod-es-krim': 190,
  'prod-pudding': 180,
  'prod-paket-nasgor': 190,
  'prod-paket-ayam': 190,
  'prod-kolak': 0,
};

// stok akhir yang sengaja dibuat rendah/habis + penyesuaian opname agar
// dashboard "Stok Rendah / Habis" terlihat hidup saat demo.
const FORCE_LOW_STOCK = [
  {
    outletId: 'outlet-kelapa-gading-001',
    productId: 'prod-udang',
    final: 2,
    reason: 'Koreksi stok opname: barang tidak layak jual',
  },
  {
    outletId: 'outlet-kelapa-gading-001',
    productId: 'prod-es-krim',
    final: 0,
    reason: 'Koreksi stok opname: stok habis',
  },
  {
    outletId: 'outlet-senayan-001',
    productId: 'prod-tahu',
    final: 1,
    reason: 'Koreksi stok opname',
  },
  {
    outletId: 'outlet-pusat-001',
    productId: 'prod-pisang',
    final: 3,
    reason: 'Koreksi stok opname: produk rusak',
  },
];

// override threshold stok rendah per outlet (FR-INV-007)
const THRESHOLD_OVERRIDES = [
  { outletId: 'outlet-pusat-001', productId: 'prod-nasgor', value: 15 },
  { outletId: 'outlet-senayan-001', productId: 'prod-esteh', value: 25 },
  { outletId: 'outlet-kelapa-gading-001', productId: 'prod-air', value: 40 },
];

// ============================================================
// UTILITAS WAKTU (Asia/Jakarta, UTC+7 tanpa DST)
// ============================================================
const DAY_MS = 86_400_000;
const TZ_OFFSET_H = 7;
const INSIGHT_WINDOW_DAYS = 30;

function wibDateParts(dayOffset: number): {
  y: number;
  m: number;
  d: number;
  dow: number;
} {
  const now = new Date();
  const utcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      dayOffset * DAY_MS,
  );
  return {
    y: utcMidnight.getUTCFullYear(),
    m: utcMidnight.getUTCMonth() + 1,
    d: utcMidnight.getUTCDate(),
    dow: utcMidnight.getUTCDay(),
  };
}

function wibAt(
  parts: { y: number; m: number; d: number },
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  return new Date(
    Date.UTC(
      parts.y,
      parts.m - 1,
      parts.d,
      hour - TZ_OFFSET_H,
      minute,
      second,
      ms,
    ),
  );
}

function dateKey(parts: { y: number; m: number; d: number }): string {
  const mm = String(parts.m).padStart(2, '0');
  const dd = String(parts.d).padStart(2, '0');
  return `${parts.y}-${mm}-${dd}`;
}

// ============================================================
// UTILITAS RANDOM
// ============================================================
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function weightedPick<T>(pool: T[]): T {
  return pool[randInt(0, pool.length - 1)];
}

function weightedChoice<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

const fmt = (n: number): string => n.toFixed(2);
const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

// ============================================================
// SEED
// ============================================================
async function main() {
  console.log('🌱 Starting seeding...');

  const passwordHash = await argon2.hash(PASSWORD);
  const year = new Date().getUTCFullYear();

  // merchant.owner_user_id -> user bersifat circular (merchant.owner_user_id dan
  // user.merchant_id). Migration add_owner_fk_deferred menjadikan FK owner
  // DEFERRABLE agar merchant + owner dapat dibuat satu transaksi. DB yang dibuat
  // dengan `prisma db push` tidak memuatnya, jadi pastikan di sini secara idempoten.
  await prisma.$executeRawUnsafe(`
    DO $BODY$
    BEGIN
      IF to_regclass('merchant') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'merchant_owner_user_id_fkey' AND condeferrable
      ) THEN
        ALTER TABLE "merchant" DROP CONSTRAINT IF EXISTS "merchant_owner_user_id_fkey";
        ALTER TABLE "merchant" ADD CONSTRAINT "merchant_owner_user_id_fkey"
          FOREIGN KEY ("owner_user_id") REFERENCES "user"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
          DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $BODY$;
  `);

  // ------------------------------------------------------------
  // 1. IDENTITY & TENANT
  // ------------------------------------------------------------
  let owner = await prisma.user.findUnique({
    where: { email: 'owner@sukses.com' },
  });

  if (!owner) {
    // FK merchant.owner_user_id -> user DEFERRABLE: merchant & owner saling menunjuk
    // (merchant.owner_user_id, user.merchant_id) sehingga wajib dibuat satu transaksi.
    await prisma.$transaction(async (tx) => {
      await tx.merchant.create({
        data: {
          id: MERCHANT_ID,
          ownerUserId: OWNER_ID,
          name: 'Toko Sukses Sejahtera',
          timezone: 'Asia/Jakarta',
          status: 'ACTIVE',
        },
      });
      await tx.user.create({
        data: {
          id: OWNER_ID,
          merchantId: MERCHANT_ID,
          name: 'Budi Owner',
          email: 'owner@sukses.com',
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    });
    owner = (await prisma.user.findUnique({
      where: { email: 'owner@sukses.com' },
    }))!;
  } else {
    // pastikan merchant mengarah ke owner yang benar dan data owner selalu segar
    await prisma.merchant.upsert({
      where: { id: MERCHANT_ID },
      update: {
        ownerUserId: owner.id,
        name: 'Toko Sukses Sejahtera',
        timezone: 'Asia/Jakarta',
        status: 'ACTIVE',
      },
      create: {
        id: MERCHANT_ID,
        ownerUserId: owner.id,
        name: 'Toko Sukses Sejahtera',
        timezone: 'Asia/Jakarta',
        status: 'ACTIVE',
      },
    });
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        name: 'Budi Owner',
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
        outletId: null,
      },
    });
  }
  console.log('✅ Merchant & Owner created');

  await prisma.user.upsert({
    where: { email: 'admin@sukses.com' },
    update: {
      name: 'Andi Admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      outletId: null,
    },
    create: {
      id: ADMIN_ID,
      merchantId: MERCHANT_ID,
      name: 'Andi Admin',
      email: 'admin@sukses.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  for (const outlet of OUTLETS) {
    await prisma.outlet.upsert({
      where: { id_merchantId: { id: outlet.id, merchantId: MERCHANT_ID } },
      update: { name: outlet.name, address: outlet.address, status: 'ACTIVE' },
      create: {
        id: outlet.id,
        merchantId: MERCHANT_ID,
        name: outlet.name,
        address: outlet.address,
        status: 'ACTIVE',
      },
    });
    await prisma.user.upsert({
      where: { email: outlet.cashier.email },
      update: {
        name: outlet.cashier.name,
        outletId: outlet.id,
        role: 'CASHIER',
        status: 'ACTIVE',
        passwordHash,
      },
      create: {
        id: outlet.cashier.id,
        merchantId: MERCHANT_ID,
        outletId: outlet.id,
        name: outlet.cashier.name,
        email: outlet.cashier.email,
        passwordHash,
        role: 'CASHIER',
        status: 'ACTIVE',
      },
    });
  }
  console.log('✅ Outlets & Cashiers created');

  // ------------------------------------------------------------
  // 2. CATALOG (Category, Product, Harga override outlet)
  // ------------------------------------------------------------
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id_merchantId: { id: cat.id, merchantId: MERCHANT_ID } },
      update: { name: cat.name, isActive: cat.isActive },
      create: {
        id: cat.id,
        merchantId: MERCHANT_ID,
        name: cat.name,
        isActive: cat.isActive,
      },
    });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { id_merchantId: { id: product.id, merchantId: MERCHANT_ID } },
      update: {
        categoryId: product.categoryId,
        name: product.name,
        price: new Prisma.Decimal(product.price),
        lowStockThreshold: product.lowStockThreshold,
        isActive: product.isActive,
      },
      create: {
        id: product.id,
        merchantId: MERCHANT_ID,
        categoryId: product.categoryId,
        name: product.name,
        price: new Prisma.Decimal(product.price),
        lowStockThreshold: product.lowStockThreshold,
        isActive: product.isActive,
      },
    });
  }

  await prisma.productOutletPrice.deleteMany({
    where: { merchantId: MERCHANT_ID },
  });
  const outletPrices: Prisma.ProductOutletPriceCreateManyInput[] = [];
  for (const [outletId, byProduct] of Object.entries(PRICE_OVERRIDES)) {
    for (const [productId, price] of Object.entries(byProduct)) {
      outletPrices.push({
        merchantId: MERCHANT_ID,
        outletId,
        productId,
        price: new Prisma.Decimal(price),
      });
    }
  }
  if (outletPrices.length > 0) {
    await prisma.productOutletPrice.createMany({ data: outletPrices });
  }
  console.log('✅ Categories, Products & outlet prices created');

  // ------------------------------------------------------------
  // 3. RESET DATA DERIVED (idempotent re-run)
  // ------------------------------------------------------------
  await prisma.transactionItem.deleteMany({
    where: { transaction: { merchantId: MERCHANT_ID } },
  });
  await prisma.transaction.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.stockMovement.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.aiInsight.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.aiAnalysisJob.deleteMany({ where: { merchantId: MERCHANT_ID } });
  await prisma.inventory.deleteMany({ where: { merchantId: MERCHANT_ID } });

  const effectivePrice = (outletId: string, productId: string): number =>
    PRICE_OVERRIDES[outletId]?.[productId] ??
    PRODUCTS.find((p) => p.id === productId)!.price;

  const productName = (productId: string): string =>
    PRODUCTS.find((p) => p.id === productId)!.name;

  // ============================================================
  // 4. GENERASI DATA TRANSAKSI & STOCK MOVEMENT (60 hari terakhir)
  // ============================================================
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const items: Prisma.TransactionItemCreateManyInput[] = [];
  const movements: Prisma.StockMovementCreateManyInput[] = [];

  // saldo berjalan stok per (outlet, product)
  const running = new Map<string, number>();
  const runningKey = (outletId: string, productId: string) =>
    `${outletId}:${productId}`;

  let seq = 0;
  let itemSeq = 0;
  let movementSeq = 0;

  const pushAdjustment = (
    outletId: string,
    productId: string,
    delta: number,
    reason: string,
    actorUserId: string,
    at: Date,
  ): void => {
    const key = runningKey(outletId, productId);
    const before = running.get(key) ?? 0;
    const after = before + delta;
    running.set(key, after);
    movementSeq += 1;
    movements.push({
      id: `seed-mv-${String(movementSeq).padStart(6, '0')}`,
      merchantId: MERCHANT_ID,
      outletId,
      productId,
      type: 'ADJUSTMENT',
      delta,
      quantityBefore: before,
      quantityAfter: after,
      reason,
      transactionId: null,
      actorUserId,
      createdAt: at,
    });
  };

  // saldo awal stok untuk seluruh outlet x produk
  for (const outlet of OUTLETS) {
    for (const product of PRODUCTS) {
      const opening = OPENING_BASE[product.id] + randInt(0, 20);
      const start = wibAt(wibDateParts(59), 7, 0, 0);
      pushAdjustment(
        outlet.id,
        product.id,
        opening,
        'Saldo awal stok (opname pembukaan)',
        ADMIN_ID,
        start,
      );
    }
  }

  // popularitas penjualan: pool berbobot
  const salePool: Array<{ productId: string; weight: number }> =
    PRODUCTS.filter((p) => p.isActive).map((p) => ({
      productId: p.id,
      weight: p.weight,
    }));

  const HOUR_POOL = [
    9, 9, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 15, 16,
    17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 21, 21, 22,
  ];

  const PAYMENT_METHODS: Array<{ value: PaymentMethod; weight: number }> = [
    { value: 'CASH', weight: 50 },
    { value: 'QRIS', weight: 35 },
    { value: 'TRANSFER', weight: 15 },
  ];

  // agregasi untuk insight AI (jendela 30 hari terakhir)
  const insightAgg = {
    totalOmzet: 0,
    transactionCount: 0,
    daily: new Map<string, { omzet: number; count: number }>(),
    byOutlet: new Map<
      string,
      { outletId: string; outletName: string; omzet: number; count: number }
    >(),
    byProduct: new Map<
      string,
      { productId: string; name: string; units: number; omzet: number }
    >(),
    byHour: new Map<number, { omzet: number; count: number }>(),
  };

  const todayParts = wibDateParts(0);
  const windowStart = wibAt(wibDateParts(INSIGHT_WINDOW_DAYS - 1), 0, 0, 0, 0);

  for (let dayOffset = 59; dayOffset >= 1; dayOffset -= 1) {
    const dayParts = wibDateParts(dayOffset);
    const weekend = dayParts.dow === 0 || dayParts.dow === 6 ? 1.4 : 1;
    const growth = 0.7 + (dayOffset / 59) * 0.5; // volume naik menuju hari ini

    for (const outlet of OUTLETS) {
      const count = Math.round(
        randInt(outlet.dailyMin, outlet.dailyMax) * weekend * growth,
      );

      // restok berkala: 4 produk terlaris tiap 3 hari (FR-INV-003, adjustment supplier)
      if (dayOffset % 3 === 0) {
        const topFour = [...salePool]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 4);
        const restockAt = wibAt(dayParts, 7, randInt(0, 59), randInt(0, 59));
        for (const item of topFour) {
          const delta = randInt(25, 40);
          const reason =
            randInt(0, 1) === 0
              ? 'Terima barang dari supplier'
              : 'Restok harian';
          pushAdjustment(
            outlet.id,
            item.productId,
            delta,
            reason,
            ADMIN_ID,
            restockAt,
          );
        }
      }

      for (let i = 0; i < count; i += 1) {
        seq += 1;
        const transactionId = `seed-txn-${String(seq).padStart(6, '0')}`;
        const hour = weightedPick(HOUR_POOL);
        const paidAt = wibAt(dayParts, hour, randInt(0, 59), randInt(0, 59));

        // pilih 1-3 produk dengan bobot popularitas; jaga stok tidak negatif
        const lineCount = weightedChoice([
          { value: 1, weight: 45 },
          { value: 2, weight: 35 },
          { value: 3, weight: 20 },
        ]);
        const picked: Array<{ productId: string; quantity: number }> = [];
        for (
          let attempt = 0;
          attempt < lineCount && picked.length < lineCount;
          attempt += 1
        ) {
          const candidate = weightedPick(salePool);
          const key = runningKey(outlet.id, candidate.productId);
          const available = running.get(key) ?? 0;
          if (available <= 0) continue;
          const qty = Math.min(
            weightedChoice([
              { value: 1, weight: 70 },
              { value: 2, weight: 25 },
              { value: 3, weight: 5 },
            ]),
            available,
          );
          const existing = picked.find(
            (p) => p.productId === candidate.productId,
          );
          if (existing) {
            existing.quantity += qty;
          } else {
            picked.push({ productId: candidate.productId, quantity: qty });
          }
        }
        if (picked.length === 0) continue;

        const unitPrice = effectivePrice(outlet.id, picked[0].productId);
        const subTotal = picked.reduce(
          (sum, line) => sum + unitPrice * line.quantity,
          0,
        );
        const paymentMethod = weightedChoice(PAYMENT_METHODS);
        const operatorUserId =
          Math.random() < 0.85 ? outlet.cashier.id : owner.id;

        transactions.push({
          id: transactionId,
          merchantId: MERCHANT_ID,
          outletId: outlet.id,
          operatorUserId,
          transactionNumber: `INV-${year}-${String(seq).padStart(6, '0')}`,
          status: 'COMPLETED',
          paymentMethod,
          paymentStatus: 'CONFIRMED',
          paidAt,
          createdAt: paidAt,
          checkoutRequestId: `seed-checkout-${String(seq).padStart(6, '0')}`,
          requestHash: sha256(`seed:${seq}`),
          subtotal: new Prisma.Decimal(subTotal),
          total: new Prisma.Decimal(subTotal),
        });

        for (const line of picked) {
          itemSeq += 1;
          const linePrice = effectivePrice(outlet.id, line.productId);
          items.push({
            id: `seed-item-${String(itemSeq).padStart(6, '0')}`,
            transactionId,
            productId: line.productId,
            productNameSnapshot: productName(line.productId),
            quantity: line.quantity,
            unitPriceSnapshot: new Prisma.Decimal(linePrice),
            subtotal: new Prisma.Decimal(linePrice * line.quantity),
          });

          // stock movement SALE
          const key = runningKey(outlet.id, line.productId);
          const before = running.get(key) ?? 0;
          const after = before - line.quantity;
          running.set(key, after);
          movementSeq += 1;
          movements.push({
            id: `seed-mv-${String(movementSeq).padStart(6, '0')}`,
            merchantId: MERCHANT_ID,
            outletId: outlet.id,
            productId: line.productId,
            type: 'SALE',
            delta: -line.quantity,
            quantityBefore: before,
            quantityAfter: after,
            reason: null,
            transactionId,
            actorUserId: operatorUserId,
            createdAt: paidAt,
          });
        }

        // kumpulkan agregasi insight untuk jendela 30 hari
        if (paidAt >= windowStart) {
          insightAgg.totalOmzet += subTotal;
          insightAgg.transactionCount += 1;

          const day = insightAgg.daily.get(dateKey(dayParts)) ?? {
            omzet: 0,
            count: 0,
          };
          day.omzet += subTotal;
          day.count += 1;
          insightAgg.daily.set(dateKey(dayParts), day);

          const outletAgg = insightAgg.byOutlet.get(outlet.id) ?? {
            outletId: outlet.id,
            outletName: outlet.name,
            omzet: 0,
            count: 0,
          };
          outletAgg.omzet += subTotal;
          outletAgg.count += 1;
          insightAgg.byOutlet.set(outlet.id, outletAgg);

          const hourAgg = insightAgg.byHour.get(hour) ?? { omzet: 0, count: 0 };
          hourAgg.omzet += subTotal;
          hourAgg.count += 1;
          insightAgg.byHour.set(hour, hourAgg);

          for (const line of picked) {
            const prod = insightAgg.byProduct.get(line.productId) ?? {
              productId: line.productId,
              name: productName(line.productId),
              units: 0,
              omzet: 0,
            };
            prod.units += line.quantity;
            prod.omzet +=
              effectivePrice(outlet.id, line.productId) * line.quantity;
            insightAgg.byProduct.set(line.productId, prod);
          }
        }
      }
    }
  }

  // koreksi opname agar beberapa item stok rendah/habis saat demo
  for (const item of FORCE_LOW_STOCK) {
    const key = runningKey(item.outletId, item.productId);
    const before = running.get(key) ?? 0;
    const delta = item.final - before;
    if (delta !== 0) {
      pushAdjustment(
        item.outletId,
        item.productId,
        delta,
        item.reason,
        ADMIN_ID,
        wibAt(todayParts, 8, 0, 0),
      );
    }
  }

  console.log(
    `✅ Generated ${transactions.length} transactions, ${items.length} items, ${movements.length} stock movements`,
  );

  await prisma.transaction.createMany({ data: transactions });
  await prisma.transactionItem.createMany({ data: items });
  await prisma.stockMovement.createMany({ data: movements });

  // ------------------------------------------------------------
  // 5. INVENTORY (saldo akhir = saldo berjalan)
  // ------------------------------------------------------------
  const inventory: Prisma.InventoryCreateManyInput[] = [];
  for (const outlet of OUTLETS) {
    for (const product of PRODUCTS) {
      const quantity = running.get(runningKey(outlet.id, product.id)) ?? 0;
      const override = THRESHOLD_OVERRIDES.find(
        (o) => o.outletId === outlet.id && o.productId === product.id,
      );
      inventory.push({
        merchantId: MERCHANT_ID,
        outletId: outlet.id,
        productId: product.id,
        quantity,
        lowStockThresholdOverride: override?.value ?? null,
      });
    }
  }
  await prisma.inventory.createMany({ data: inventory });
  console.log('✅ Inventory created');

  // pastikan sequence nomor transaksi ada (migration add_transaction_number_sequence)
  // dan lanjut setelah nomor seed agar checkout berikutnya tidak bertabrakan.
  await prisma.$executeRawUnsafe(
    'CREATE SEQUENCE IF NOT EXISTS "transaction_number_seq" START 1;',
  );
  if (seq > 0) {
    await prisma.$executeRawUnsafe(
      `SELECT setval('transaction_number_seq', ${seq}, true)`,
    );
  }

  // ------------------------------------------------------------
  // 6. AI ANALYSIS JOBS & INSIGHTS
  // ------------------------------------------------------------
  for (let jobOffset = 0; jobOffset < 7; jobOffset += 1) {
    const parts = wibDateParts(jobOffset);
    const analysisDate = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
    await prisma.aiAnalysisJob.create({
      data: {
        merchantId: MERCHANT_ID,
        analysisDate,
        state: 'READY',
        attempts: 1,
        nextRetryAt: null,
        errorCategory: null,
      },
    });
  }

  const windowEnd = wibAt(todayParts, 23, 59, 59, 999);
  const generatedAt = wibAt(todayParts, 8, 30, 0, 0);
  const dataVersion = `v1:${generatedAt.toISOString()}`;
  const avgValue =
    insightAgg.transactionCount > 0
      ? insightAgg.totalOmzet / insightAgg.transactionCount
      : 0;

  const dailySeries = [...insightAgg.daily.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, agg]) => ({
      bucket_start: day,
      omzet: fmt(agg.omzet),
      transaction_count: agg.count,
      average_transaction_value: fmt(agg.omzet / agg.count),
    }));

  const aovSeries = dailySeries.map((point) => ({
    bucket_start: point.bucket_start,
    average_transaction_value: point.average_transaction_value,
  }));

  const topProducts = [...insightAgg.byProduct.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      unitsSold: p.units,
      omzet: fmt(p.omzet),
    }));

  const leastProducts = [...insightAgg.byProduct.values()]
    .filter((p) => p.units > 0)
    .sort((a, b) => a.units - b.units)
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      unitsSold: p.units,
      omzet: fmt(p.omzet),
    }));

  const outletComparison = [...insightAgg.byOutlet.values()].map((o) => ({
    outletId: o.outletId,
    outletName: o.outletName,
    omzet: fmt(o.omzet),
    transactionCount: o.count,
  }));

  const hours = [...insightAgg.byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hourOfDay, agg]) => ({
      hourOfDay,
      omzet: fmt(agg.omzet),
      transactionCount: agg.count,
    }));

  const topProduct = topProducts[0];
  const bestOutlet = [...outletComparison].sort(
    (a, b) => Number(b.omzet) - Number(a.omzet),
  )[0];
  const busyHours = [...hours].sort(
    (a, b) => b.transactionCount - a.transactionCount,
  );
  const lunch = busyHours.find((h) => h.hourOfDay >= 11 && h.hourOfDay <= 14);
  const dinner = busyHours.find((h) => h.hourOfDay >= 18 && h.hourOfDay <= 21);

  const insights: Prisma.AiInsightCreateManyInput[] = [
    {
      merchantId: MERCHANT_ID,
      type: 'SALES_TREND',
      title: 'Tren penjualan Merchant',
      content:
        `Selama 30 hari terakhir, Toko Sukses Sejahtera mencatat omzet ${rupiah(insightAgg.totalOmzet)} ` +
        `dari ${insightAgg.transactionCount} transaksi dengan nilai rata-rata ${rupiah(Math.round(avgValue))} per transaksi. ` +
        `Volume penjualan cenderung meningkat pada akhir pekan, menunjukkan peluang optimalisasi promosi di hari kerja.`,
      evidenceSummary: {
        schema_version: 1,
        type: 'SALES_TREND',
        payload: {
          total_omzet: fmt(insightAgg.totalOmzet),
          transaction_count: insightAgg.transactionCount,
          average_transaction_value: fmt(avgValue),
          trend: dailySeries,
        },
      },
      status: 'READY',
      periodStart: windowStart,
      periodEnd: windowEnd,
      dataVersion,
      generatedAt,
    },
    {
      merchantId: MERCHANT_ID,
      type: 'AOV_TREND',
      title: 'Tren nilai rata-rata transaksi',
      content:
        `Nilai rata-rata transaksi dalam 30 hari terakhir adalah ${rupiah(Math.round(avgValue))}. ` +
        `Tren AOV berfluktuasi harian namun tetap stabil di kisaran ${rupiah(Math.round(avgValue * 0.8))}–${rupiah(Math.round(avgValue * 1.2))}, ` +
        `indikasi harga dan bundling paket yang diterima pelanggan.`,
      evidenceSummary: {
        schema_version: 1,
        type: 'AOV_TREND',
        payload: {
          average_transaction_value: fmt(avgValue),
          trend: aovSeries,
        },
      },
      status: 'READY',
      periodStart: windowStart,
      periodEnd: windowEnd,
      dataVersion,
      generatedAt,
    },
    {
      merchantId: MERCHANT_ID,
      type: 'OUTLET_COMPARISON',
      title: 'Perbandingan performa Outlet',
      content:
        `${bestOutlet?.outletName ?? 'Cabang Pusat'} memimpin dengan omzet ${rupiah(Number(bestOutlet?.omzet ?? 0))} ` +
        `dari ${bestOutlet?.transactionCount ?? 0} transaksi. Outlet lain dapat mengejar dengan strategi menu dan jam operasional yang disesuaikan.`,
      evidenceSummary: {
        schema_version: 1,
        type: 'OUTLET_COMPARISON',
        payload: { outlets: outletComparison },
      },
      status: 'READY',
      periodStart: windowStart,
      periodEnd: windowEnd,
      dataVersion,
      generatedAt,
    },
    {
      merchantId: MERCHANT_ID,
      type: 'TOP_PRODUCTS',
      title: 'Produk terlaris dan kurang laku',
      content:
        `Produk paling laris adalah ${topProduct?.name ?? '-'} dengan ${topProduct?.unitsSold ?? 0} unit terjual ` +
        `senilai ${rupiah(Number(topProduct?.omzet ?? 0))}. Pertimbangkan restok rutin dan promosi silang untuk produk yang kurang laku.`,
      evidenceSummary: {
        schema_version: 1,
        type: 'TOP_PRODUCTS',
        payload: {
          top_selling: topProducts,
          least_selling: leastProducts,
        },
      },
      status: 'READY',
      periodStart: windowStart,
      periodEnd: windowEnd,
      dataVersion,
      generatedAt,
    },
    {
      merchantId: MERCHANT_ID,
      type: 'TIME_PATTERN',
      title: 'Pola waktu penjualan',
      content:
        `Pola penjualan menunjukkan jam tersibuk pada sesi ${lunch ? `makan siang (${lunch.hourOfDay}.00) dengan ${lunch.transactionCount} transaksi` : '-'} ` +
        `dan ${dinner ? `makan malam (${dinner.hourOfDay}.00) dengan ${dinner.transactionCount} transaksi` : '-'}. ` +
        `Penambahan staf kasir pada jam tersebut dapat mempercepat layanan.`,
      evidenceSummary: {
        schema_version: 1,
        type: 'TIME_PATTERN',
        payload: { hours },
      },
      status: 'READY',
      periodStart: windowStart,
      periodEnd: windowEnd,
      dataVersion,
      generatedAt,
    },
  ];
  await prisma.aiInsight.createMany({ data: insights });
  console.log('✅ AI Analysis Jobs & Insights created');

  // ------------------------------------------------------------
  // RINGKASAN
  // ------------------------------------------------------------
  const summary = await Promise.all([
    prisma.user.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.outlet.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.category.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.product.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.inventory.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.stockMovement.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.transaction.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.transactionItem.count({
      where: { transaction: { merchantId: MERCHANT_ID } },
    }),
    prisma.aiAnalysisJob.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.aiInsight.count({ where: { merchantId: MERCHANT_ID } }),
    prisma.productOutletPrice.count({ where: { merchantId: MERCHANT_ID } }),
  ]);
  const [
    users,
    outlets,
    categories,
    products,
    inventoryCount,
    movementsCount,
    txns,
    itemCount,
    jobs,
    insightsCount,
    outletPriceCount,
  ] = summary;

  console.log('🎉 Seeding completed successfully!');
  console.log('────────────────────────────────────────────');
  console.log('📊 Ringkasan data demo:');
  console.log(`   Merchant        : 1 (Toko Sukses Sejahtera)`);
  console.log(`   User            : ${users} (owner/admin/kasir)`);
  console.log(`   Outlet          : ${outlets}`);
  console.log(`   Category        : ${categories}`);
  console.log(`   Product         : ${products}`);
  console.log(`   Harga override  : ${outletPriceCount}`);
  console.log(`   Inventory       : ${inventoryCount}`);
  console.log(`   Stock movement  : ${movementsCount}`);
  console.log(`   Transaction     : ${txns}`);
  console.log(`   Transaction item: ${itemCount}`);
  console.log(`   AI analysis job : ${jobs}`);
  console.log(`   AI insight      : ${insightsCount}`);
  console.log('────────────────────────────────────────────');
  console.log('🔑 Akun demo (password: password123):');
  console.log('   OWNER  : owner@sukses.com');
  console.log('   ADMIN  : admin@sukses.com');
  for (const outlet of OUTLETS) {
    console.log(`   CASHIER: ${outlet.cashier.email} (${outlet.name})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
