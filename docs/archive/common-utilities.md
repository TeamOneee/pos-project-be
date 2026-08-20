# Common Utilities Guide

Dokumentasi ini menjelaskan **cara penggunaan semua utilitas** yang berada pada folder `src/common/` di backend.

`common/` hanya berisi hal yang benar-benar **generic** dan dapat dipakai lintas module. Sesuai **Modular Architecture Guideline bagian 20**, jangan menaruh business logic module ke dalam `common/` (misal `inventory.service.ts` atau `transaction.helper.ts`) karena itu milik module masing-masing.

---

## Daftar Isi

1. [Struktur Folder](#1-struktur-folder)
2. [Role dan Status Types](#2-role-dan-status-types---commontypesrolets)
3. [BaseRepository](#3-baserepository---commonrepositoriesbase-repositoryts)
4. [UnitOfWork (Transaction Lintas-Module)](#4-unitofwork---commontransactions)
5. [Hash Helper (bcrypt)](#5-hash-helper---commonhelpershashelperts)
6. [JwtAuthGuard](#6-jwtauthguard---commonguardsjwt-authguardts)
7. [RoleGuard](#7-roleguard---commonguardsrole-guardts)
8. [GetUser Decorator](#8-getuser-decorator---commondecoratorsget-userdecoratorts)
9. [TransformInterceptor (Format Response)](#9-transforminterceptor---commoninterceptorstransforminterceptorts)
10. [GlobalExceptionFilter (Format Error)](#10-globalexceptionfilter---commonfiltershttp-exceptionfilterts)
11. [Registrasi Global di main.ts](#11-registrasi-global-di-maints)
12. [Ringkasan Aturan Pemakaian](#12-ringkasan-aturan-pemakaian)

---

## 1. Struktur Folder

```text
src/common/
├── decorators/
│   └── get-user.decorator.ts        → GetUser + UserPayload
├── filters/
│   └── http-exception.filter.ts     → GlobalExceptionFilter
├── guards/
│   ├── jwt-auth.guard.ts            → JwtAuthGuard
│   └── role.guard.ts                → RoleGuard
├── helpers/
│   └── hash.helper.ts               → hashing (bcrypt)
├── interceptors/
│   └── transform.interceptor.ts     → TransformInterceptor
├── repositories/
│   └── base.repository.ts           → BaseRepository
├── transactions/
│   ├── unit-of-work.ts              → UnitOfWork
│   └── unit-of-work.module.ts       → UnitOfWorkModule
└── types/
    └── role.ts                      → UserRole & UserStatus
```

---

## 2. Role dan Status Types — `src/common/types/role.ts`

Enum & type untuk `role` dan `status` pengguna, agar seluruh module memakai satu sumber nilai yang sama.

```ts
export const UserRole = { OWNER, ADMIN, CASHIER }
export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER'

export const UserStatus = { ACTIVE, INACTIVE }
export type UserStatus = 'ACTIVE' | 'INACTIVE'
```

### Cara pakai

```ts
import { UserRole, UserStatus } from 'src/common/types/role';

const role: UserRole = UserRole.OWNER;
const status: UserStatus = UserStatus.ACTIVE;
```

`UserPayload` (lihat bagian 8) menggunakan `UserRole` ini agar konsisten dengan `RoleGuard`.

---

## 3. BaseRepository — `src/common/repositories/base.repository.ts`

Class dasar untuk semua repository agar mendukung **transaction fallback pattern**. Menyediakan method `getPrismaClient(tx)`:

- Jika dipanggil di dalam transaction → memakai `tx` (transaction client).
- Jika dipanggil tanpa transaction → memakai `this.prisma` (PrismaService biasa).

### Cara pakai

Repository `extends BaseRepository` dan memakai `getPrismaClient(tx)` di setiap operasi DB.

```ts
import { Prisma } from '@prisma/client';
import { BaseRepository } from 'src/common/repositories/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

export class MerchantsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createMerchant(name: string, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).merchant.create({ data: { name } });
  }
}
```

> **Prinsip boundary:** repository hanya mengakses tabel yang menjadi ownership module-nya. Jangan gunakan `BaseRepository` untuk mengakses tabel module lain.

---

## 4. UnitOfWork — `src/common/transactions`

UnitOfWork adalah **transaction orchestrator bersama** untuk melakukan operasi atomik lintas-module **tanpa membuat module pemanggil bergantung langsung pada `PrismaService`**.

### Registrasi module

```ts
// dalam module yang membutuhkan transaction lintas-module
imports: [UnitOfWorkModule]
```

### `UnitOfWork.run()` + parameter `tx`

Orchestrator (contoh `AuthService`) memanggil `run()` lalu **menyerahkan `tx`** ke service/repository module lain.

```ts
import { UnitOfWork } from 'src/common/transactions/unit-of-work';

const result = await this.unitOfWork.run(async (tx) => {
  const merchant = await this.merchantsService.createMerchant(name, tx);
  const user = await this.usersService.createUser(dto, tx);
  return { merchant, user };
});
// jika salah satu gagal, semua di-rollback
```

Service yang menerima `tx` wajib meneruskannya ke repository:

```ts
async createMerchant(name: string, tx?: Prisma.TransactionClient) {
  return this.repo.createMerchant(name, tx); // repo memakai getPrismaClient(tx)
}
```

> 📦 Contoh riil ada di `AuthService.register()` — membuat merchant + owner dalam satu transaction.

---

## 5. Hash Helper — `src/common/helpers/hash.helper.ts`

Pembungkus **bcrypt**. Catatan: nama class-nya `hashing` (huruf kecil) sesuai kodebase.

```ts
import { hashing } from 'src/common/helpers/hash.helper';

// simpan hasil hash ke database
const hashedPassword = await hashing.hash(rawPassword);

// cek password saat login
const isValid = await hashing.compare(rawPassword, user.password);
```

- `hash(password: string): Promise<string>` — default salt rounds = 10.
- `compare(password: string, hashPassword: string): Promise<boolean>`

> **Catatan boundary:** hashing/verifikasi password adalah urusan **Auth**, sedangkan penyimpanan data user adalah urusan **User Module** (via `UsersService`).

---

## 6. JwtAuthGuard — `src/common/guards/jwt-auth.guard.ts`

Guard Passport untuk melindungi endpoint yang memerlukan **JWT Bearer Token**. Saat sukses, ia menempelkan `req.user` (sesuai `UserPayload`) sehingga bisa diambil lewat `@GetUser()`.

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() { ... }
}
```

> Semua endpoint **kecuali** `/auth/login` dan `/auth/register` diharuskan menggunakan guard ini (sesuai API Contract).

---

## 7. RoleGuard — `src/common/guards/role.guard.ts`

Guard **RBAC** berbasis factory. Dipakai setelah `JwtAuthGuard` (karena membaca `req.user.role`).

```ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/common/types/role';

@Controller('dashboard')
export class DashboardController {
  @Get('owner')
  @UseGuards(JwtAuthGuard, RoleGuard(UserRole.OWNER))
  ownerOverview() { ... }
}
```

Rules:
- `RoleGuard(UserRole.OWNER)` / `UserRole.ADMIN` / `UserRole.CASHIER`.
- Jika role tidak sesuai → `ForbiddenException` (403).
- **Urutan penting:** `JwtAuthGuard` harus dipasang **lebih dulu** daripada `RoleGuard`.

---

## 8. GetUser Decorator — `src/common/decorators/get-user.decorator.ts`

Mengambil data user yang sudah di-authenticate (dari `req.user`) di dalam parameter controller.

### `UserPayload`

```ts
interface UserPayload {
  userId: string;
  email: string;
  role: UserRole;
  merchantId: string;
  outletId?: string; // ada untuk CASHIER, kosong untuk OWNER/ADMIN
}
```

### Cara pakai

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { UserPayload } from 'src/common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: UserPayload) {
    return { data: user };
  }

  @Get('outlet')
  @UseGuards(JwtAuthGuard)
  myOutlet(@GetUser('outletId') outletId: string) {
    return { data: { outletId } };
  }
}
```

#### Catatan TypeScript

File ini menggunakan `isolatedModules` + `emitDecoratorMetadata`, sehingga **import tipe** harus menggunakan `import type`:

```ts
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { UserPayload } from 'src/common/decorators/get-user.decorator';
```

---

## 9. TransformInterceptor — `src/common/interceptors/transform.interceptor.ts`

Interceptor global yang membungkus semua respons sukses menjadi format **konsisten API Contract**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {}
}
```

### Konvensi return dari controller

1. **Mengembalikan object berisi data** → akan dibungkus apa adanya:

   ```ts
   return { message: 'User data retrieved', data: user };
   ```
   → `message` = "User data retrieved", `data` = `user`.

2. **Mengembalikan object biasa tanpa `message`/`data`** → dianggap sebagai `data`, `message` = default (`"Operation successful"`, atau `"Resource created successful"` untuk status 201).

3. **Hanya `message` tanpa `data`** → `data` menjadi `null`.

4. `data: null` secara eksplisit tetap dikirim sebagai `null` (misal saat logout).

---

## 10. GlobalExceptionFilter — `src/common/filters/http-exception.filter.ts`

Filter global yang mengubah semua error menjadi format **konsisten**:

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/products",
  "message": "Product name is required",
  "errors": null,
  "timestamp": "2026-08-12T00:00:00.000Z"
}
```

### Perilaku

| Kondisi | statusCode | message |
|---|---|---|
| `HttpException` biasa | `exception.getStatus()` | `message` dari exception |
| status **429** | 429 | `"Too many requests"` |
| Error non-HTTP (unexpected) | 500 | `"Terjadi kesalahan pada sistem internal"` + di-log |
| Response `message` berbentuk array | - | diambil elemen pertama |

`errors` diisi jika exception membawa field error (misal saat melempar `BadRequestException` berisi array), selain itu `null`.

Filter ini dipasang **global** (lihat bagian 11) sehingga controller tidak perlu menangani error satu per satu — cukup `throw` exception dari `@nestjs/common`.

---

## 11. Registrasi Global di main.ts

Tiga utilitas berikut dipasang **global** di `src/main.ts` dan berlaku untuk semua endpoint:

```ts
app.setGlobalPrefix('api');

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (validationErrors) => {
      const messages = validationErrors.map(
        (error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      );
      return new BadRequestException(messages);
    },
  }),
);

app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalFilters(new GlobalExceptionFilter());
```

| Komponen | Efek |
|---|---|
| `ValidationPipe` | Validasi DTO otomatis pada semua endpoint |
| `TransformInterceptor` | Format respons sukses (`success/statusCode/message/data`) |
| `GlobalExceptionFilter` | Format error yang konsisten |

---

## 12. Ringkasan Aturan Pemakaian

1. **Hanya yang generic** — `common/` untuk alat bantu lintas-module, larangan menaruh business logic di sini.

2. **Repository** — selalu `extends BaseRepository` dan gunakan `getPrismaClient(tx)` agar otomatis patuh pada transaction context.

3. **Transaction lintas-module** — gunakan `UnitOfWork.run()` + parameter `tx`; jangan inject `PrismaService` langsung ke service yang meng-orchestrasi banyak module.

4. **Autentikasi & otorisasi** — pasang `JwtAuthGuard` dulu, baru `RoleGuard`.

5. **Ambil user yang login** — pakai `@GetUser()` (dan `import type` untuk `UserPayload`).

6. **Response** — biarkan `TransformInterceptor` dan `GlobalExceptionFilter` menangani format; controller cukup `return { message, data }` atau melempar exception.