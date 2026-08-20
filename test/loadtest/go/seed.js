// Seed data + token untuk load test checkout (6000 request).
// Jalankan: DATABASE_URL=... JWT_ACCESS_SECRET=... node test/loadtest/seed.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const MERCHANT_ID = 'merchant-load';
const OWNER_USER_ID = 'user-owner-load';
const OUTLET_ID = '00000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '00000000-0000-4000-8000-000000000020';
const PRODUCT_IDS = [
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000014',
];
const PRODUCT_NAMES = ['Es Teh', 'Kopi Susu', 'Matcha Latte', 'Lemon Tea', 'Air Mineral'];
const STOCK_PER_PRODUCT = 1000000;

function signJwt(secret, claims, expiresInSeconds) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ ...claims, iat: now, exp: now + expiresInSeconds }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function main() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET wajib di-set');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib di-set');

  console.log('Membersihkan data lama...');
  // TRUNCATE ... CASCADE: seluruh tabel yang mereferensikan merchant (langsung
  // maupun transitif) ikut dibersihkan tanpa melanggar FK RESTRICT (mis. FK
  // owner_user_id ON DELETE RESTRICT tidak bisa dideferral).
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "merchant" CASCADE');

  console.log('Membuat merchant + owner...');
  await prisma.$transaction([
    prisma.merchant.create({
      data: {
        id: MERCHANT_ID,
        ownerUserId: OWNER_USER_ID,
        name: 'Merchant Load Test',
        timezone: 'Asia/Jakarta',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        id: OWNER_USER_ID,
        merchantId: MERCHANT_ID,
        outletId: null,
        name: 'Owner Load Test',
        email: 'owner@load.test',
        passwordHash: 'unused',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log('Membuat outlet, category, products, inventory...');
  await prisma.outlet.create({
    data: {
      id: OUTLET_ID,
      merchantId: MERCHANT_ID,
      name: 'Outlet Utama',
      status: 'ACTIVE',
    },
  });

  await prisma.category.create({
    data: { id: CATEGORY_ID, merchantId: MERCHANT_ID, name: 'Minuman' },
  });

  for (let i = 0; i < PRODUCT_IDS.length; i += 1) {
    const productId = PRODUCT_IDS[i];
    await prisma.product.create({
      data: {
        id: productId,
        merchantId: MERCHANT_ID,
        categoryId: CATEGORY_ID,
        name: PRODUCT_NAMES[i],
        price: 5000 + i * 5000,
        lowStockThreshold: 5,
        isActive: true,
      },
    });
    await prisma.inventory.create({
      data: {
        merchantId: MERCHANT_ID,
        outletId: OUTLET_ID,
        productId,
        quantity: STOCK_PER_PRODUCT,
      },
    });
  }

  const token = signJwt(
    secret,
    {
      sub: OWNER_USER_ID,
      merchant_id: MERCHANT_ID,
      role: 'OWNER',
      outlet_id: null,
    },
    7200,
  );
  require('fs').writeFileSync(`${__dirname}/token.txt`, token);

  console.log('Seed selesai.');
  console.log('  merchant:', MERCHANT_ID);
  console.log('  outlet  :', OUTLET_ID);
  console.log('  products:', PRODUCT_IDS.join(', '));
  console.log('  stock   :', STOCK_PER_PRODUCT, 'per product');
  console.log('  token   : test/loadtest/token.txt');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());