# Git Commit & Branching Convention

---

## 1. Branching Strategy

Kita menggunakan **Git Flow** sederhana dengan 3 jenis branch utama:

| Branch | Nama | Deskripsi |
|--------|------|-----------|
| **Main** | `main` | Production-ready code. Hanya menerima merge dari `develop` saat release. |
| **Develop** | `develop` | Integration branch untuk pengembangan. Semua feature branch merge ke sini. |
| **Feature** | `feat/nama-fitur` | Untuk pengembangan fitur baru. Branch dari `develop`, merge balik ke `develop`. |
| **Hotfix** | `hotfix/nama-hotfix` | Untuk perbaikan darurat di production. Branch dari `main`, merge ke `main` dan `develop`. |

---

### 1.1 Branch Naming Convention

| Tipe | Format | Contoh |
|------|--------|--------|
| **Feature** | `feat/nama-fitur-pendek` | `feat/auth-register` |
| **Feature** | `feat/module-nama-fitur` | `feat/inventory-adjustment` |
| **Hotfix** | `hotfix/issue-yang-diperbaiki` | `hotfix/fix-transaction-rollback` |
| **Bugfix** | `bugfix/nama-bug` | `bugfix/cart-stock-validation` |
| **Chore** | `chore/nama-tugas` | `chore/update-dependencies` |
| **Docs** | `docs/nama-dokumen` | `docs/update-api-contract` |

---

## 2. Commit Message Convention

Gunakan format **Conventional Commits**:

```
<type>(<scope>): <subject>
```

### 2.1 Type

| Type | Deskripsi | Contoh |
|------|-----------|--------|
| **feat** | Fitur baru | `feat(auth): add register endpoint` |
| **fix** | Perbaikan bug | `fix(cart): fix stock validation on add item` |
| **docs** | Perubahan dokumentasi | `docs(readme): update installation guide` |
| **style** | Perubahan format code (spasi, indentation, dll) | `style(inventory): fix indentation` |
| **refactor** | Refactor code tanpa mengubah behavior | `refactor(transaction): extract validation logic` |
| **perf** | Perbaikan performa | `perf(dashboard): optimize query aggregation` |
| **test** | Menambah/mengubah test | `test(auth): add login unit test` |
| **chore** | Tugas maintenance (update dependencies, config, dll) | `chore(deps): update prisma to 5.0.0` |
| **build** | Perubahan build system / dependencies | `build(docker): update Dockerfile` |
| **ci** | Perubahan CI/CD | `ci(github): add deploy workflow` |
| **revert** | Revert commit sebelumnya | `revert: revert commit abc123` |

---

### 2.2 Scope

Scope adalah **module atau area** yang diubah. Gunakan nama module dari sistem:

| Scope | Deskripsi |
|-------|-----------|
| `auth` | Authentication & Authorization |
| `merchant` | Merchant management |
| `outlet` | Outlet management |
| `user` | User / staff management |
| `category` | Category management |
| `product` | Product management |
| `inventory` | Inventory / stock management |
| `cart` | Cart management |
| `transaction` | Transaction / checkout |
| `dashboard` | Dashboard module |
| `analytics` | Analytics module |
| `ai` | AI Insight module |
| `common` | Common utilities (guards, decorators, filters) |
| `db` | Database / Prisma schema |
| `docs` | Documentation |
| `config` | Configuration files |
| `deps` | Dependencies |

---

### 2.3 Subject

- Gunakan **imperative mood** (seperti memberi perintah)
- **Maksimal 50 karakter**
- **Jangan diakhiri titik**
- Gunakan **huruf kecil semua** (kecuali singkatan)

---

### 2.4 Contoh Commit Message

#### ✅ Benar

```
feat(auth): add register endpoint for merchant + owner
fix(cart): prevent adding product with insufficient stock
docs(api): update transaction endpoint response format
refactor(inventory): extract stock validation to separate method
perf(dashboard): use read replica for owner dashboard
test(transaction): add unit test for checkout idempotency
chore(deps): update prisma to version 5.15.0
feat(ai): implement L1 job queue with AiJobRecord
fix(transaction): rollback stock if checkout fails
```

#### ❌ Salah

```
add register                          <- tidak ada type & scope
feat: add register                    <- tidak ada scope
feat(auth): added register endpoint.  <- pakai past tense + titik
fix bug                               <- terlalu vague
Update code                           <- tidak jelas
```

---

## 3. Commit Message dengan Body (Opsional)

Untuk commit yang membutuhkan penjelasan lebih detail:

```
<type>(<scope>): <subject>

<body menjelaskan WHY dan WHAT, bukan HOW>
- Point 1
- Point 2

<footer: closes #issue-number>
```

### Contoh

```
feat(inventory): add stock adjustment with reason

Admin now must provide reason when adjusting stock.
This is required for audit trail and accountability.

Closes #42
```

---

## 4. Pull Request / Merge Request

### 4.1 Nama PR

Gunakan format yang sama dengan commit:

```
<type>(<scope>): <deskripsi singkat>
```

Contoh:
- `feat(auth): implement register and login`
- `fix(cart): fix stock validation logic`

### 4.2 Template PR

```markdown
## Deskripsi
<!-- Jelaskan apa yang diubah dan mengapa -->

## Changes
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Documentation

## Testing
<!-- Jelaskan bagaimana testing dilakukan -->

## Screenshots (jika ada)

## Related Issues
Closes #issue-number
```

---

## 5. Workflow

### 5.1 Membuat Feature Branch

```bash
# Dari develop
git checkout develop
git pull origin develop
git checkout -b feat/auth-register
```

### 5.2 Commit dan Push

```bash
# Setelah selesai
git add .
git commit -m "feat(auth): add register endpoint for merchant + owner"
git push origin feat/auth-register
```

### 5.3 Merge ke Develop

1. Buat Pull Request dari `feat/auth-register` ke `develop`
2. Review code
3. Merge
4. Hapus branch

### 5.4 Hotfix

```bash
# Dari main
git checkout main
git pull origin main
git checkout -b hotfix/fix-transaction-rollback
# ... fix bug
git commit -m "fix(transaction): rollback stock if checkout fails"
git push origin hotfix/fix-transaction-rollback
```

---

## 6. Ringkasan Cepat

| Komponen | Format | Contoh |
|---|---|---|
| **Branch Feature** | `feat/nama-fitur` | `feat/auth-register` |
| **Branch Hotfix** | `hotfix/nama-bug` | `hotfix/fix-stock-negatif` |
| **Commit Type** | `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, dll | `feat` |
| **Commit Scope** | `auth`, `cart`, `inventory`, `transaction`, dll | `auth` |
| **Commit Subject** | `< 50 chars, imperative, lowercase` | `add register endpoint` |
| **Full Commit** | `<type>(<scope>): <subject>` | `feat(auth): add register endpoint` |

---

## 7. Contoh Skenario

### Skenario 1: Menambahkan Fitur Register

```bash
git checkout -b feat/auth-register
# ... coding ...
git add .
git commit -m "feat(auth): add register endpoint for merchant + owner"
git push origin feat/auth-register
# Buat PR ke develop
```

### Skenario 2: Perbaikan Bug di Cart

```bash
git checkout -b bugfix/cart-stock-validation
# ... fix bug ...
git add .
git commit -m "fix(cart): prevent adding product with insufficient stock"
git push origin bugfix/cart-stock-validation
```

### Skenario 3: Update Dokumentasi

```bash
git checkout -b docs/update-api-contract
# ... update docs ...
git add .
git commit -m "docs(api): update transaction endpoint response format"
git push origin docs/update-api-contract
```

### Skenario 4: Refactor Kode

```bash
git checkout -b refactor/inventory-validation
# ... refactor ...
git add .
git commit -m "refactor(inventory): extract stock validation to separate method"
git push origin refactor/inventory-validation
```

---

## 8. Alias Git (Opsional)

Tambahkan ke `~/.gitconfig` untuk mempermudah:

```ini
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    unstage = reset HEAD --
    last = log -1 HEAD
    tree = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
```

---

**End of Document**