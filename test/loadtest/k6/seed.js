// Seed skenario multi-aktor (k6): N merchant x (1 owner + 2 outlet + 1 kasir + 1 admin),
// 5 produk + inventory per outlet, dan JWT per user -> data.json.
// Jalankan: DATABASE_URL=... JWT_ACCESS_SECRET=... N_MERCHANTS=500 node test/loadtest/scenario/seed.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const N = Number(process.env.N_MERCHANTS || 500);
const PRODUCTS_PER_MERCHANT = 5;
const OUTLETS_PER_MERCHANT = 2;
const STOCK_PER_PRODUCT = 100000;
const PRODUCT_NAMES = ['Es Teh', 'Kopi Susu', 'Matcha Latte', 'Lemon Tea', 'Air Mineral'];

const padHex = (n, w) => n.toString(16).padStart(w, '0');
const uuid = (prefix, n) => `${prefix}-0000-4000-8000-${padHex(n, 12)}`;

const merchantId = (i) => uuid('00000000', i);
const outletId = (i, o) => uuid(o === 0 ? '10000000' : '20000000', i);
const productId = (i, j) => uuid('30000000', i * PRODUCTS_PER_MERCHANT + j);
const categoryId = (i) => uuid('40000000', i);
const userIds = (i) => ({
  owner: `user-owner-${i}`,
  cashier: `user-cashier-${i}`,
  admin: `user-admin-${i}`,
});

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

  console.log(`Membersihkan data lama (TRUNCATE merchant CASCADE)...`);
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "merchant" CASCADE');

  console.log(`Membuat ${N} merchant + owner (circular FK via \$transaction)...`);
  for (let i = 0; i < N; i += 1) {
    const mId = merchantId(i);
    const ids = userIds(i);
    await prisma.$transaction([
      prisma.merchant.create({
        data: { id: mId, ownerUserId: ids.owner, name: `Merchant ${i}`, timezone: 'Asia/Jakarta', status: 'ACTIVE' },
      }),
      prisma.user.create({
        data: { id: ids.owner, merchantId: mId, outletId: null, name: `Owner ${i}`, email: `owner-${i}@load.test`, passwordHash: 'unused', role: 'OWNER', status: 'ACTIVE' },
      }),
    ]);
  }

  console.log(`Membuat ${N * OUTLETS_PER_MERCHANT} outlet...`);
  const outlets = [];
  for (let i = 0; i < N; i += 1) {
    for (let o = 0; o < OUTLETS_PER_MERCHANT; o += 1) {
      outlets.push({ id: outletId(i, o), merchantId: merchantId(i), name: `Outlet ${o} - ${i}`, status: 'ACTIVE' });
    }
  }
  await prisma.outlet.createMany({ data: outlets });

  console.log(`Membuat ${N * 2} user kasir + admin...`);
  const cashierUsers = [];
  const adminUsers = [];
  for (let i = 0; i < N; i += 1) {
    const mId = merchantId(i);
    const ids = userIds(i);
    cashierUsers.push({ id: ids.cashier, merchantId: mId, outletId: outletId(i, 0), name: `Kasir ${i}`, email: `cashier-${i}@load.test`, passwordHash: 'unused', role: 'CASHIER', status: 'ACTIVE' });
    adminUsers.push({ id: ids.admin, merchantId: mId, outletId: null, name: `Admin ${i}`, email: `admin-${i}@load.test`, passwordHash: 'unused', role: 'ADMIN', status: 'ACTIVE' });
  }
  await prisma.user.createMany({ data: cashierUsers });
  await prisma.user.createMany({ data: adminUsers });

  console.log(`Membuat ${N} kategori + ${N * PRODUCTS_PER_MERCHANT} produk...`);
  const categories = [];
  const products = [];
  for (let i = 0; i < N; i += 1) {
    const mId = merchantId(i);
    const cId = categoryId(i);
    categories.push({ id: cId, merchantId: mId, name: 'Minuman' });
    for (let j = 0; j < PRODUCTS_PER_MERCHANT; j += 1) {
      products.push({ id: productId(i, j), merchantId: mId, categoryId: cId, name: `${PRODUCT_NAMES[j]} ${i}`, price: 5000 + j * 5000, lowStockThreshold: 5, isActive: true });
    }
  }
  await prisma.category.createMany({ data: categories });
  await prisma.product.createMany({ data: products });

  console.log(`Membuat ${N * OUTLETS_PER_MERCHANT * PRODUCTS_PER_MERCHANT} inventory...`);
  const inventory = [];
  for (let i = 0; i < N; i += 1) {
    const mId = merchantId(i);
    for (let o = 0; o < OUTLETS_PER_MERCHANT; o += 1) {
      for (let j = 0; j < PRODUCTS_PER_MERCHANT; j += 1) {
        inventory.push({ merchantId: mId, outletId: outletId(i, o), productId: productId(i, j), quantity: STOCK_PER_PRODUCT });
      }
    }
  }
  await prisma.inventory.createMany({ data: inventory });

  console.log('Membuat JWT per user -> data.json...');
  const cashiers = [];
  const owners = [];
  const admins = [];
  for (let i = 0; i < N; i += 1) {
    const mId = merchantId(i);
    const ids = userIds(i);
    const productsOfMerchant = [];
    for (let j = 0; j < PRODUCTS_PER_MERCHANT; j += 1) productsOfMerchant.push(productId(i, j));
    cashiers.push({
      token: signJwt(secret, { sub: ids.cashier, merchant_id: mId, role: 'CASHIER', outlet_id: outletId(i, 0) }, 7200),
      outletId: outletId(i, 0),
      productIds: productsOfMerchant,
    });
    owners.push({ token: signJwt(secret, { sub: ids.owner, merchant_id: mId, role: 'OWNER', outlet_id: null }, 7200) });
    admins.push({
      token: signJwt(secret, { sub: ids.admin, merchant_id: mId, role: 'ADMIN', outlet_id: null }, 7200),
      outletId: outletId(i, 1),
      productId: productId(i, 0),
    });
  }

  fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify({ base: `http://localhost:${process.env.PORT || 3001}/api/v1`, cashiers, owners, admins }));
  console.log('Seed selesai.');
  console.log('  merchant   :', N);
  console.log('  outlet     :', N * OUTLETS_PER_MERCHANT);
  console.log('  user       :', N * 3, '(owner/kasir/admin)');
  console.log('  inventory  :', N * OUTLETS_PER_MERCHANT * PRODUCTS_PER_MERCHANT);
  console.log('  data.json  : test/loadtest/scenario/data.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
