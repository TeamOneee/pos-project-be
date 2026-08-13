# API CONTRACT — Full Document (UPDATED)

---

## Daftar Isi

1. [Authentication](#1-authentication)
2. [Response Format](#2-response-format)
3. [Error Response Format](#3-error-response-format)
4. [Endpoints](#4-endpoints)
   - [Auth Module](#41-auth-module)
   - [Merchant Module](#42-merchant-module)
   - [Outlet Module](#43-outlet-module)
   - [User Module](#44-user-module)
   - [Category Module](#45-category-module)
   - [Product Module](#46-product-module)
   - [Inventory Module](#47-inventory-module)
   - [Cart Module](#48-cart-module)
   - [Transaction Module](#49-transaction-module)
   - [Dashboard Module](#410-dashboard-module)
   - [Analytics Module](#411-analytics-module)
   - [AI Insight Module](#412-ai-insight-module)
5. [HTTP Status Codes](#5-http-status-codes)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Notes](#7-notes)

---

## 1. Authentication

Semua endpoint (kecuali `/auth/login` dan `/auth/register`) memerlukan **Bearer Token**:

```
Authorization: Bearer <jwt_token>
```

---

## 2. Response Format

### Success Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    // Response data goes here (null if no data)
  }
}
```

### Pagination Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Data retrieved successfully",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 10,
    "total_pages": 10
  }
}
```

---

## 3. Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/products",
  "message": "Product name is required",
  "errors": [
    {
      "field": "name",
      "message": "Name should not be empty"
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

## 4. Endpoints

### 4.1 Auth Module

#### POST /auth/register
Register new merchant and owner account in one request.

**Headers:** None (public endpoint)

**Description:**
- Membuat merchant baru sekaligus user dengan role OWNER
- User pertama dalam merchant selalu menjadi OWNER
- Tidak memerlukan authentication

**Request Body:**
```json
{
  "merchant": {
    "name": "IndoMart Retail"
  },
  "user": {
    "name": "John Doe",
    "email": "owner@indomart.com",
    "password": "SecurePassword123!"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchant.name` | string | ✅ | Nama merchant/bisnis |
| `user.name` | string | ✅ | Nama lengkap owner |
| `user.email` | string | ✅ | Email owner (unique) |
| `user.password` | string | ✅ | Password (min 8 karakter) |

**Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Merchant and owner account created successfully",
  "data": {
    "merchant": {
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "IndoMart Retail",
      "low_stock_threshold": 10,
      "created_at": "2026-08-13T14:30:00.000Z",
      "updated_at": "2026-08-13T14:30:00.000Z"
    },
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "outlet_id": null,
      "name": "John Doe",
      "email": "owner@indomart.com",
      "role": "OWNER",
      "status": "ACTIVE",
      "created_at": "2026-08-13T14:30:00.000Z",
      "updated_at": "2026-08-13T14:30:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (Email already exists):**
```json
{
  "success": false,
  "statusCode": 409,
  "path": "/api/v1/auth/register",
  "message": "Email already registered",
  "errors": [
    {
      "field": "email",
      "message": "Email owner@indomart.com is already used"
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### POST /auth/login
Login ke sistem.

**Headers:** None (public endpoint)

**Request Body:**
```json
{
  "email": "owner@indomart.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "outlet_id": null,
      "name": "John Doe",
      "email": "owner@indomart.com",
      "role": "OWNER",
      "status": "ACTIVE"
    }
  }
}
```

**Error Response (Invalid credentials):**
```json
{
  "success": false,
  "statusCode": 401,
  "path": "/api/v1/auth/login",
  "message": "Invalid email or password",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### POST /auth/logout
Logout dari sistem.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logout successful",
  "data": null
}
```

---

#### GET /auth/me
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User data retrieved",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "outlet_id": null,
    "name": "John Doe",
    "email": "owner@indomart.com",
    "role": "OWNER",
    "status": "ACTIVE",
    "created_at": "2026-08-13T14:30:00.000Z",
    "updated_at": "2026-08-13T14:30:00.000Z"
  }
}
```

---

### 4.2 Merchant Module

#### GET /merchants
Get merchant details.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Merchant data retrieved",
  "data": {
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "IndoMart Retail",
    "low_stock_threshold": 10,
    "created_at": "2026-08-13T14:30:00.000Z",
    "updated_at": "2026-08-13T14:30:00.000Z"
  }
}
```

---

#### PUT /merchants
Update merchant details.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Request Body:**
```json
{
  "name": "IndoMart Retail Updated",
  "low_stock_threshold": 15
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Merchant updated successfully",
  "data": {
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "IndoMart Retail Updated",
    "low_stock_threshold": 15
  }
}
```

---

### 4.3 Outlet Module

#### GET /outlets
Get all outlets (with optional filters).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `ACTIVE` or `INACTIVE` (optional) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Outlets retrieved successfully",
  "data": [
    {
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Outlet A - Mall Central",
      "address": "Jl. Sudirman No. 123, Jakarta",
      "status": "ACTIVE",
      "created_at": "2026-08-13T14:30:00.000Z",
      "updated_at": "2026-08-13T14:30:00.000Z"
    }
  ]
}
```

---

#### POST /outlets
Create new outlet.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Request Body:**
```json
{
  "name": "Outlet D - New Mall",
  "address": "Jl. Gatot Subroto No. 45, Jakarta",
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Outlet created successfully",
  "data": {
    "outlet_id": "550e8400-e29b-41d4-a716-446655440003",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Outlet D - New Mall",
    "address": "Jl. Gatot Subroto No. 45, Jakarta",
    "status": "ACTIVE"
  }
}
```

---

#### GET /outlets/{outletId}
Get outlet by ID.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outletId` | uuid | Outlet ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Outlet data retrieved",
  "data": {
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Outlet A - Mall Central",
    "address": "Jl. Sudirman No. 123, Jakarta",
    "status": "ACTIVE"
  }
}
```

---

#### PUT /outlets/{outletId}
Update outlet.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outletId` | uuid | Outlet ID |

**Request Body:**
```json
{
  "name": "Outlet A - Updated",
  "address": "Jl. Sudirman No. 456, Jakarta",
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Outlet updated successfully",
  "data": {
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Outlet A - Updated",
    "address": "Jl. Sudirman No. 456, Jakarta",
    "status": "INACTIVE"
  }
}
```

---

#### DELETE /outlets/{outletId}
Deactivate outlet (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outletId` | uuid | Outlet ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Outlet deactivated successfully",
  "data": null
}
```

---

### 4.4 User Module

#### GET /users
Get all users (with optional filters).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | `OWNER`, `ADMIN`, or `CASHIER` (optional) |
| `outlet_id` | uuid | Filter by outlet (optional) |
| `status` | string | `ACTIVE` or `INACTIVE` (optional) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440004",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "CASHIER",
      "status": "ACTIVE",
      "created_at": "2026-08-13T14:30:00.000Z",
      "updated_at": "2026-08-13T14:30:00.000Z"
    }
  ]
}
```

---

#### POST /users
Create new user.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Request Body:**
```json
{
  "name": "Ani Wijaya",
  "email": "ani@example.com",
  "password": "password123",
  "role": "CASHIER",
  "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "ACTIVE"
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Nama lengkap user |
| `email` | string | ✅ | Email user (unique) |
| `password` | string | ✅ | Password (min 8 karakter) |
| `role` | string | ✅ | `ADMIN` or `CASHIER` (OWNER hanya lewat register) |
| `outlet_id` | uuid | ❌ | Wajib untuk CASHIER, harus null untuk ADMIN |
| `status` | string | ❌ | `ACTIVE` or `INACTIVE` (default: ACTIVE) |

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User created successfully",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440005",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Ani Wijaya",
    "email": "ani@example.com",
    "role": "CASHIER",
    "status": "ACTIVE"
  }
}
```

**Error Response (Cashier without outlet):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/users",
  "message": "outlet_id is required for CASHIER role",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

**Error Response (Admin with outlet):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/users",
  "message": "ADMIN role must have outlet_id = null",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### GET /users/{userId}
Get user by ID.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | uuid | User ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User data retrieved",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440005",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Ani Wijaya",
    "email": "ani@example.com",
    "role": "CASHIER",
    "status": "ACTIVE"
  }
}
```

---

#### PUT /users/{userId}
Update user.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | uuid | User ID |

**Request Body:**
```json
{
  "name": "Ani Wijaya Updated",
  "email": "ani.updated@example.com",
  "role": "ADMIN",
  "outlet_id": null,
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "Ani Wijaya Updated",
    "email": "ani.updated@example.com",
    "role": "ADMIN",
    "status": "INACTIVE"
  }
}
```

---

#### DELETE /users/{userId}
Deactivate user (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | uuid | User ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deactivated successfully",
  "data": null
}
```

---

### 4.5 Category Module

#### GET /categories
Get all categories.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "category_id": "550e8400-e29b-41d4-a716-446655440006",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Beverages",
      "status": "ACTIVE",
      "created_at": "2026-08-13T14:30:00.000Z",
      "updated_at": "2026-08-13T14:30:00.000Z"
    }
  ]
}
```

---

#### POST /categories
Create new category.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Request Body:**
```json
{
  "name": "Snacks"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Category created successfully",
  "data": {
    "category_id": "550e8400-e29b-41d4-a716-446655440007",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Snacks",
    "status": "ACTIVE"
  }
}
```

---

#### PUT /categories/{categoryId}
Update category.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `categoryId` | uuid | Category ID |

**Request Body:**
```json
{
  "name": "Snacks & Chips"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Category updated successfully",
  "data": {
    "category_id": "550e8400-e29b-41d4-a716-446655440007",
    "name": "Snacks & Chips"
  }
}
```

---

#### DELETE /categories/{categoryId}
Deactivate category (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `categoryId` | uuid | Category ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Category deactivated successfully",
  "data": null
}
```

---

### 4.6 Product Module

#### GET /products
Get all products with pagination and filters.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category_id` | uuid | Filter by category (optional) |
| `status` | string | `ACTIVE` or `INACTIVE` (optional) |
| `search` | string | Search by name or SKU (optional) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 10) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products retrieved successfully",
  "data": {
    "items": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
        "category_id": "550e8400-e29b-41d4-a716-446655440006",
        "name": "Coca Cola 1.5L",
        "sku": "CC-1500",
        "price": "15000.00",
        "status": "ACTIVE",
        "created_at": "2026-08-13T14:30:00.000Z",
        "updated_at": "2026-08-13T14:30:00.000Z",
        "category": {
          "category_id": "550e8400-e29b-41d4-a716-446655440006",
          "name": "Beverages"
        }
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 10,
    "total_pages": 16
  }
}
```

---

#### POST /products
Create new product.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Request Body:**
```json
{
  "name": "Sprite 1.5L",
  "sku": "SP-1500",
  "price": "15000.00",
  "category_id": "550e8400-e29b-41d4-a716-446655440006",
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "product_id": "550e8400-e29b-41d4-a716-446655440009",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "category_id": "550e8400-e29b-41d4-a716-446655440006",
    "name": "Sprite 1.5L",
    "sku": "SP-1500",
    "price": "15000.00",
    "status": "ACTIVE"
  }
}
```

**Error Response (Category inactive):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/products",
  "message": "Category is not active or does not belong to merchant",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### GET /products/{productId}
Get product by ID.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | uuid | Product ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product data retrieved",
  "data": {
    "product_id": "550e8400-e29b-41d4-a716-446655440008",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "category_id": "550e8400-e29b-41d4-a716-446655440006",
    "name": "Coca Cola 1.5L",
    "sku": "CC-1500",
    "price": "15000.00",
    "status": "ACTIVE",
    "category": {
      "category_id": "550e8400-e29b-41d4-a716-446655440006",
      "name": "Beverages"
    }
  }
}
```

---

#### PUT /products/{productId}
Update product.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | uuid | Product ID |

**Request Body:**
```json
{
  "name": "Coca Cola 2L",
  "sku": "CC-2000",
  "price": "18000.00",
  "category_id": "550e8400-e29b-41d4-a716-446655440006",
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product updated successfully",
  "data": {
    "product_id": "550e8400-e29b-41d4-a716-446655440008",
    "name": "Coca Cola 2L",
    "sku": "CC-2000",
    "price": "18000.00",
    "status": "ACTIVE"
  }
}
```

---

#### DELETE /products/{productId}
Deactivate product (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER, ADMIN

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | uuid | Product ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product deactivated successfully",
  "data": null
}
```

---

### 4.7 Inventory Module

#### GET /inventory
Get inventory by outlet.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | **Required** - Outlet ID |
| `product_id` | uuid | Filter by product (optional) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 10) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory retrieved successfully",
  "data": {
    "items": [
      {
        "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
        "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 20,
        "updated_at": "2026-08-13T14:30:00.000Z",
        "product": {
          "product_id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "Coca Cola 1.5L",
          "sku": "CC-1500",
          "price": "15000.00"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

---

#### GET /inventory/outlet/{outletId}/product/{productId}
Get inventory by outlet and product.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outletId` | uuid | Outlet ID |
| `productId` | uuid | Product ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory data retrieved",
  "data": {
    "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "product_id": "550e8400-e29b-41d4-a716-446655440008",
    "quantity": 20,
    "updated_at": "2026-08-13T14:30:00.000Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory data retrieved",
  "data": {
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "product_id": "550e8400-e29b-41d4-a716-446655440008",
    "quantity": 0
  }
}
```

---

#### PUT /inventory/{inventoryId}
Update inventory quantity.

**Headers:** `Authorization: Bearer <token>`

**Access:** ADMIN

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `inventoryId` | uuid | Inventory ID |

**Request Body:**
```json
{
  "quantity": 25,
  "reason": "Restock from supplier"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory updated successfully",
  "data": {
    "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "product_id": "550e8400-e29b-41d4-a716-446655440008",
    "quantity": 25,
    "updated_at": "2026-08-13T14:30:00.000Z"
  }
}
```

**Error Response (quantity negatif / reason kosong):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/inventory/{inventoryId}",
  "message": "reason is required for manual stock adjustment",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

**Error Response (Owner trying to access):**
```json
{
  "success": false,
  "statusCode": 403,
  "path": "/api/v1/inventory/{inventoryId}",
  "message": "Only ADMIN can modify inventory",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### PUT /inventory/bulk
Bulk update inventory quantities.

**Headers:** `Authorization: Bearer <token>`

**Access:** ADMIN

**Description:**
Update multiple inventory items in one request.

**Request Body:**
```json
{
  "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
  "items": [
    {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
      "quantity": 25,
      "reason": "Restock from supplier"
    },
    {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440011",
      "quantity": 10,
      "reason": "Stock adjustment"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory updated",
  "data": [
    {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "quantity": 25,
      "updated_at": "2026-08-13T14:30:00.000Z"
    },
    {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440011",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "product_id": "550e8400-e29b-41d4-a716-446655440012",
      "quantity": 10,
      "updated_at": "2026-08-13T14:30:00.000Z"
    }
  ]
}
```

---

#### POST /inventory/transfer
Transfer stock between outlets.

**Headers:** `Authorization: Bearer <token>`

**Access:** ADMIN

**Description:**
Move stock from one outlet to another.

**Request Body:**
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440008",
  "from_outlet_id": "550e8400-e29b-41d4-a716-446655440002",
  "to_outlet_id": "550e8400-e29b-41d4-a716-446655440003",
  "quantity": 5,
  "reason": "Transfer to new outlet"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stock transferred successfully",
  "data": {
    "from_inventory": {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "quantity": 15
    },
    "to_inventory": {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440013",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440003",
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "quantity": 20
    },
    "transferred_quantity": 5
  }
}
```

**Error Response (Insufficient Stock):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/inventory/transfer",
  "message": "Insufficient stock at source outlet",
  "errors": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "product_name": "Coca Cola 1.5L",
      "requested": 5,
      "available": 3
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### GET /inventory/low-stock
Get low stock alerts across all outlets.

**Headers:** `Authorization: Bearer <token>`

**Access:** ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Low stock alerts retrieved",
  "data": [
    {
      "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "product_name": "Coca Cola 1.5L",
      "sku": "CC-1500",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "outlet_name": "Outlet A - Mall Central",
      "current_stock": 5,
      "threshold": 10
    }
  ]
}
```

---

### 4.8 Cart Module

#### GET /cart
Get current user's cart.

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Description:**
Returns the active cart for the authenticated cashier.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cart details",
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440014",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_id": "550e8400-e29b-41d4-a716-446655440004",
    "created_at": "2026-08-13T14:30:00.000Z",
    "updated_at": "2026-08-13T14:30:00.000Z",
    "items": [
      {
        "cart_item_id": "550e8400-e29b-41d4-a716-446655440015",
        "cart_id": "550e8400-e29b-41d4-a716-446655440014",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 2,
        "unit_price": "15000.00",
        "subtotal": "30000.00",
        "product": {
          "product_id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "Coca Cola 1.5L",
          "sku": "CC-1500",
          "price": "15000.00"
        }
      }
    ],
    "subtotal": "30000.00",
    "total_items": 1
  }
}
```

**Error Response (Cart Not Found):**
```json
{
  "success": false,
  "statusCode": 404,
  "path": "/api/v1/cart",
  "message": "Cart not found",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### POST /cart/items
Add item to cart.

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Description:**
Add a product to the current cart.

**Request Body:**
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440008",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item added to cart",
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440014",
    "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_id": "550e8400-e29b-41d4-a716-446655440004",
    "items": [
      {
        "cart_item_id": "550e8400-e29b-41d4-a716-446655440015",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 2,
        "unit_price": "15000.00",
        "subtotal": "30000.00"
      }
    ],
    "subtotal": "30000.00",
    "total_items": 1
  }
}
```

**Error Response (Insufficient Stock):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/cart/items",
  "message": "Insufficient stock for product: Coca Cola 1.5L",
  "errors": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "product_name": "Coca Cola 1.5L",
      "requested": 5,
      "available": 3
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### PUT /cart/items/{cartItemId}
Update cart item quantity.

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cartItemId` | uuid | Cart item ID |

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cart item updated",
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440014",
    "items": [
      {
        "cart_item_id": "550e8400-e29b-41d4-a716-446655440015",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 3,
        "unit_price": "15000.00",
        "subtotal": "45000.00"
      }
    ],
    "subtotal": "45000.00",
    "total_items": 1
  }
}
```

---

#### DELETE /cart/items/{cartItemId}
Remove item from cart.

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cartItemId` | uuid | Cart item ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item removed from cart",
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440014",
    "items": [],
    "subtotal": "0.00",
    "total_items": 0
  }
}
```

---

#### DELETE /cart/clear
Clear all items from cart.

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cart cleared",
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440014",
    "items": [],
    "subtotal": "0.00",
    "total_items": 0
  }
}
```

---

### 4.9 Transaction Module

#### GET /transactions
Get transactions with filters and pagination.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role (CASHIER hanya outlet sendiri)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |
| `start_date` | date | Start date (YYYY-MM-DD) |
| `end_date` | date | End date (YYYY-MM-DD) |
| `cashier_id` | uuid | Filter by cashier (optional) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 10) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Transactions retrieved successfully",
  "data": {
    "items": [
      {
        "transaction_id": "550e8400-e29b-41d4-a716-446655440016",
        "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
        "user_id": "550e8400-e29b-41d4-a716-446655440004",
        "transaction_number": "TRX-20260813-001",
        "subtotal": "150000.00",
        "total": "150000.00",
        "status": "COMPLETED",
        "created_at": "2026-08-13T14:30:00.000Z",
        "outlet": {
          "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Outlet A - Mall Central"
        },
        "cashier": {
          "user_id": "550e8400-e29b-41d4-a716-446655440004",
          "name": "Budi Santoso"
        }
      }
    ],
    "total": 1250,
    "page": 1,
    "limit": 10,
    "total_pages": 125
  }
}
```

---

#### POST /transactions
Create new transaction (checkout).

**Headers:** `Authorization: Bearer <token>`

**Access:** CASHIER

**Request Body (using cart):**
```json
{
  "cart_id": "550e8400-e29b-41d4-a716-446655440014"
}
```

**Request Body (direct items):**
```json
{
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "quantity": 2
    },
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440009",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Transaction completed successfully",
  "data": {
    "transaction": {
      "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "user_id": "550e8400-e29b-41d4-a716-446655440004",
      "transaction_number": "TRX-20260813-002",
      "subtotal": "45000.00",
      "total": "45000.00",
      "status": "COMPLETED",
      "created_at": "2026-08-13T14:35:00.000Z"
    },
    "items": [
      {
        "transaction_item_id": "550e8400-e29b-41d4-a716-446655440018",
        "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 2,
        "unit_price": "15000.00",
        "subtotal": "30000.00"
      },
      {
        "transaction_item_id": "550e8400-e29b-41d4-a716-446655440019",
        "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
        "product_id": "550e8400-e29b-41d4-a716-446655440009",
        "quantity": 1,
        "unit_price": "15000.00",
        "subtotal": "15000.00"
      }
    ],
    "receipt": {
      "receipt_number": "RC-20260813-002",
      "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
      "issued_at": "2026-08-13T14:35:00.000Z"
    }
  }
}
```

**Response (Idempotent - duplicate transaction):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Transaction already exists, returning existing data",
  "data": {
    "transaction": {
      "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
      "transaction_number": "TRX-20260813-002",
      "total": "45000.00",
      "status": "COMPLETED"
    }
  }
}
```

**Error Response (Insufficient Stock):**
```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/transactions",
  "message": "Insufficient stock for product: Coca Cola 1.5L",
  "errors": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "product_name": "Coca Cola 1.5L",
      "requested": 5,
      "available": 3
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

**Error Response (Price Changed):**
```json
{
  "success": false,
  "statusCode": 409,
  "path": "/api/v1/transactions",
  "message": "Cart validation failed",
  "errors": [
    {
      "code": "PRICE_CHANGED",
      "product_id": "550e8400-e29b-41d4-a716-446655440008",
      "product_name": "Coca Cola 1.5L",
      "cart_price": "15000.00",
      "current_price": "18000.00"
    }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

#### GET /transactions/{transactionId}
Get transaction by ID.

**Headers:** `Authorization: Bearer <token>`

**Access:** Semua role (CASHIER hanya milik outlet-nya)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `transactionId` | uuid | Transaction ID |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Transaction data retrieved",
  "data": {
    "transaction": {
      "transaction_id": "550e8400-e29b-41d4-a716-446655440017",
      "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
      "user_id": "550e8400-e29b-41d4-a716-446655440004",
      "transaction_number": "TRX-20260813-002",
      "subtotal": "45000.00",
      "total": "45000.00",
      "status": "COMPLETED",
      "created_at": "2026-08-13T14:35:00.000Z"
    },
    "items": [
      {
        "transaction_item_id": "550e8400-e29b-41d4-a716-446655440018",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "quantity": 2,
        "unit_price": "15000.00",
        "subtotal": "30000.00",
        "product": {
          "product_id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "Coca Cola 1.5L",
          "sku": "CC-1500"
        }
      }
    ]
  }
}
```

---

#### POST /transactions/{transactionId}/cancel — FUTURE / OUT OF SCOPE MVP
Refund/void transaksi final **di luar MVP**.

**Headers:** `Authorization: Bearer <token>`

**Access:** FUTURE

**Response (belum tersedia):**
```json
{
  "success": false,
  "statusCode": 501,
  "path": "/api/v1/transactions/{transactionId}/cancel",
  "message": "Not implemented in MVP",
  "errors": null,
  "timestamp": "2026-08-13T14:35:00.000Z"
}
```

---

### 4.10 Dashboard Module

#### GET /dashboard/owner
Get complete Owner dashboard data.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER`, `THIS_YEAR` (default: THIS_MONTH) |
| `outlet_id` | uuid | Filter by specific outlet (optional) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "summary": {
      "total_revenue": "15750000.00",
      "total_transactions": 1250,
      "total_orders": 1250,
      "average_order_value": "12600.00",
      "total_products_sold": 3420,
      "total_outlets": 3,
      "total_employees": 12,
      "total_products": 156,
      "revenue_growth": 12.5,
      "transactions_growth": 8.3
    },
    "sales_trend": {
      "labels": ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"],
      "datasets": {
        "revenue": ["2100000.00", "1800000.00", "2250000.00", "1950000.00", "2400000.00", "2700000.00", "2550000.00"],
        "transactions": [180, 150, 190, 165, 210, 230, 220]
      },
      "summary": {
        "highest_revenue": "2700000.00",
        "lowest_revenue": "1800000.00",
        "average_revenue": "2250000.00",
        "total_revenue": "15750000.00"
      }
    },
    "outlet_performance": [
      {
        "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
        "outlet_name": "Outlet A - Mall Central",
        "total_revenue": "7250000.00",
        "total_transactions": 580,
        "average_order_value": "12500.00",
        "total_products_sold": 1520,
        "contribution_percentage": 46.03,
        "revenue_growth": 15.2
      }
    ],
    "top_products": {
      "by_revenue": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440008",
          "product_name": "Coca Cola 1.5L",
          "sku": "CC-1500",
          "category_name": "Beverages",
          "total_quantity_sold": 450,
          "total_revenue": "6750000.00",
          "rank": 1
        }
      ],
      "by_quantity": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440008",
          "product_name": "Coca Cola 1.5L",
          "sku": "CC-1500",
          "category_name": "Beverages",
          "total_quantity_sold": 450,
          "total_revenue": "6750000.00",
          "rank": 1
        }
      ]
    },
    "underperforming_products": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440020",
        "product_name": "Premium Coffee Beans",
        "sku": "PCB-001",
        "category_name": "Coffee",
        "total_quantity_sold": 5,
        "total_revenue": "175000.00",
        "stock_level": 50,
        "days_without_sale": 14,
        "recommendation": "PROMOTION"
      }
    ],
    "time_pattern": {
      "hourly_distribution": [
        {"hour": 8, "revenue": "150000.00", "transaction_count": 12},
        {"hour": 12, "revenue": "450000.00", "transaction_count": 35},
        {"hour": 19, "revenue": "500000.00", "transaction_count": 38}
      ],
      "peak_hours": [12, 13, 19, 20],
      "busiest_day": "Saturday",
      "quietest_day": "Monday",
      "insights": [
        "Peak sales occur between 12:00-13:00 and 19:00-20:00",
        "Saturday shows the highest transaction volume"
      ]
    },
    "aov_trend": {
      "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
      "values": ["11200.00", "11800.00", "12500.00", "12600.00"],
      "current_aov": "12600.00",
      "previous_aov": "11800.00",
      "growth_percentage": 6.78
    },
    "recent_transactions": [
      {
        "transaction_id": "550e8400-e29b-41d4-a716-446655440016",
        "transaction_number": "TRX-20260813-001",
        "outlet_name": "Outlet A - Mall Central",
        "cashier_name": "Budi Santoso",
        "total": "150000.00",
        "created_at": "2026-08-13T14:30:00.000Z"
      }
    ],
    "merchant_overview": {
      "merchant_name": "IndoMart Retail",
      "total_outlets_active": 3,
      "total_employees_active": 12,
      "total_products_active": 156,
      "total_categories": 8,
      "last_ai_analysis": "2026-08-12T08:00:00.000Z",
      "ai_available_today": true
    },
    "period_comparison": {
      "current_period": {
        "start_date": "2026-08-01",
        "end_date": "2026-08-11",
        "total_revenue": "15750000.00",
        "total_transactions": 1250
      },
      "previous_period": {
        "start_date": "2026-07-21",
        "end_date": "2026-07-31",
        "total_revenue": "14000000.00",
        "total_transactions": 1150
      },
      "changes": {
        "revenue_percentage": 12.5,
        "transactions_percentage": 8.7,
        "aov_percentage": 6.78
      }
    }
  }
}
```

---

#### GET /dashboard/admin
Get Admin dashboard data - **Inventory Overview**.

**Headers:** `Authorization: Bearer <token>`

**Access:** ADMIN

**Description:**
Dashboard for Admin - operational inventory management overview. Only Admin can access.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by specific outlet (optional) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin inventory dashboard data",
  "data": {
    "summary": {
      "total_outlets": 3,
      "total_products": 156,
      "total_stock_value": "27500000.00",
      "total_stock_items": 3420,
      "low_stock_products_count": 8,
      "out_of_stock_products_count": 3
    },
    "low_stock_alerts": [
      {
        "inventory_id": "550e8400-e29b-41d4-a716-446655440010",
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "product_name": "Coca Cola 1.5L",
        "sku": "CC-1500",
        "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
        "outlet_name": "Outlet A - Mall Central",
        "current_stock": 5,
        "threshold": 10
      }
    ],
    "out_of_stock_alerts": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440021",
        "product_name": "Mineral Water 600ml",
        "sku": "MW-600",
        "outlet_id": "550e8400-e29b-41d4-a716-446655440003",
        "outlet_name": "Outlet B - City Plaza"
      }
    ],
    "outlet_quick_stats": [
      {
        "outlet_id": "550e8400-e29b-41d4-a716-446655440002",
        "outlet_name": "Outlet A - Mall Central",
        "total_products": 120,
        "total_stock": 1200,
        "low_stock_count": 3,
        "out_of_stock_count": 1
      },
      {
        "outlet_id": "550e8400-e29b-41d4-a716-446655440003",
        "outlet_name": "Outlet B - City Plaza",
        "total_products": 100,
        "total_stock": 1100,
        "low_stock_count": 5,
        "out_of_stock_count": 2
      }
    ]
  }
}
```

**Error Response (Not Authorized):**
```json
{
  "success": false,
  "statusCode": 403,
  "path": "/api/v1/dashboard/admin",
  "message": "Only Admin can access this endpoint",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

### 4.11 Analytics Module

#### GET /analytics/sales-trend
Get sales trend data for charts.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |
| `start_date` | date | **Required** - Start date (YYYY-MM-DD) |
| `end_date` | date | **Required** - End date (YYYY-MM-DD) |
| `interval` | string | `DAILY`, `WEEKLY`, `MONTHLY` (default: DAILY) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sales trend data retrieved",
  "data": {
    "trend": [
      {
        "date": "2026-08-01",
        "total_sales": "2100000.00",
        "transaction_count": 180
      },
      {
        "date": "2026-08-02",
        "total_sales": "1800000.00",
        "transaction_count": 150
      }
    ],
    "summary": {
      "total_revenue": "15750000.00",
      "average_daily_revenue": "2250000.00",
      "total_transactions": 1250,
      "average_daily_transactions": 178
    }
  }
}
```

---

#### GET /analytics/time-pattern
Get hourly sales distribution pattern.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |
| `period` | string | `TODAY`, `THIS_WEEK`, `THIS_MONTH` (default: THIS_WEEK) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Time pattern data retrieved",
  "data": {
    "patterns": [
      {"hour": 8, "revenue": "150000.00", "transaction_count": 12},
      {"hour": 9, "revenue": "250000.00", "transaction_count": 20},
      {"hour": 10, "revenue": "180000.00", "transaction_count": 15}
    ],
    "peak_hours": [12, 13, 19, 20],
    "average_transactions_per_hour": 35
  }
}
```

---

#### GET /analytics/aov-trend
Get Average Order Value trend.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |
| `period` | string | `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER`, `THIS_YEAR` (default: THIS_MONTH) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "AOV trend data retrieved",
  "data": {
    "trend": [
      {"period": "Week 1", "aov": "11200.00", "transaction_count": 280},
      {"period": "Week 2", "aov": "11800.00", "transaction_count": 310},
      {"period": "Week 3", "aov": "12500.00", "transaction_count": 330},
      {"period": "Week 4", "aov": "12600.00", "transaction_count": 330}
    ],
    "overall_aov": "12600.00",
    "aov_change_percentage": 6.78
  }
}
```

---

#### GET /analytics/product-performance
Get product performance analysis (best/worst sellers).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outlet_id` | uuid | Filter by outlet (optional) |
| `period` | string | `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER` (default: THIS_MONTH) |
| `sort_by` | string | `REVENUE` or `QUANTITY` (default: REVENUE) |
| `limit` | integer | Number of products (default: 10) |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product performance data retrieved",
  "data": {
    "top_sellers": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440008",
        "product_name": "Coca Cola 1.5L",
        "sku": "CC-1500",
        "category_name": "Beverages",
        "total_sold": 450,
        "total_revenue": "6750000.00",
        "rank": 1
      }
    ],
    "underperformers": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440020",
        "product_name": "Premium Coffee Beans",
        "sku": "PCB-001",
        "category_name": "Coffee",
        "total_sold": 5,
        "total_revenue": "175000.00",
        "rank": 1,
        "days_without_sale": 14
      }
    ]
  }
}
```

---

### 4.12 AI Insight Module

#### POST /ai-insights/analyze
Trigger AI analysis (manual by Owner only).

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Response (Accepted):**
```json
{
  "success": true,
  "statusCode": 202,
  "message": "AI analysis started",
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440023",
    "status": "PROCESSING",
    "message": "AI analysis is being processed. Results will be available shortly."
  }
}
```

**Response (Job still running — idempotent):**
```json
{
  "success": false,
  "statusCode": 409,
  "path": "/api/v1/ai-insights/analyze",
  "message": "AI analysis is already in progress",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

**Error Response (Not Authorized):**
```json
{
  "success": false,
  "statusCode": 403,
  "path": "/api/v1/ai-insights/analyze",
  "message": "Only Owner can trigger AI analysis",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}

---

#### GET /ai-insights
Get the current AI insight for merchant.

**Headers:** `Authorization: Bearer <token>`

**Access:** OWNER

**Description:**
Hubungan Merchant → AI Insight bersifat **1:1** dan sistem **tidak menyimpan histori**. Endpoint ini mengembalikan hasil analisis terakhir.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "AI insight retrieved",
  "data": {
    "insight_id": "550e8400-e29b-41d4-a716-446655440024",
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Low Stock Alert: Coca Cola 1.5L",
    "content": "Stock for Coca Cola 1.5L at Outlet A will run out in 2 days based on current sales velocity. Consider restocking 50 units.",
    "type": "STOCK_WARNING",
    "status": "READY",
    "created_at": "2026-08-13T08:00:00.000Z",
    "updated_at": "2026-08-13T08:00:00.000Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "statusCode": 404,
  "path": "/api/v1/ai-insights",
  "message": "AI insight not found",
  "errors": null,
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

---

## 5. HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (for async operations) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |


**End of Document**