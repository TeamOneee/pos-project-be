---

# 📋 **POS System - API Contract Documentation**

**Version:** 1.0.0    
**Base URL:** `https://api.pos-system.com/api/v1`    
**Last Updated:** August 11, 2026

---

## 📌 **Daftar Isi**

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

---

## 1. **Authentication**

Semua endpoint (kecuali `/auth/login`) memerlukan **Bearer Token**:

```  
Authorization: Bearer \<jwt_token>  
```

---

## 2. **Response Format**

### **Success Response:**  
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

### **Pagination Response:**  
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

## 3. **Error Response Format**

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
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

## 4. **Endpoints**

### **4.1 Auth Module**

Oke bener! Untuk register, kita buat **1 endpoint khusus** yang langsung register **Merchant + Owner** sekaligus. Karena satu Owner hanya memiliki satu Merchant pada MVP (FR-TEN-002, model multi-tenant), owner langsung register merchant dan akun owner-nya dalam 1 request.

---

## Tambahan Endpoint: Register

---

### **POST /auth/register**

Register new merchant and owner account in one request.

**Description:**  
- Membuat merchant baru sekaligus user dengan role OWNER  
- User pertama dalam merchant selalu menjadi OWNER  
- Tidak memerlukan authentication (public endpoint)

---

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

---

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
      "created_at": "2026-08-11T14:30:00.000Z",  
      "updated_at": "2026-08-11T14:30:00.000Z"  
    },  
    "user": {  
      "user_id": "550e8400-e29b-41d4-a716-446655440001",  
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",  
      "outlet_id": null,  
      "name": "John Doe",  
      "email": "owner@indomart.com",  
      "role": "OWNER",  
      "status": "ACTIVE",  
      "created_at": "2026-08-11T14:30:00.000Z",  
      "updated_at": "2026-08-11T14:30:00.000Z"  
    },  
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJlbWFpbCI6Im93bmVyQGluZG9tYXJ0LmNvbSIsInJvbGUiOiJPV05FUiIsIm1lcmNoYW50X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwiaWF0IjoxNzI2MDAwMDAwLCJleHAiOjE3MjYwMDM2MDB9.signature"  
  }  
}  
```

---

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
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

**Error Response (Validation Error):**

```json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/auth/register",  
  "message": "Validation failed",  
  "errors": [  
    {  
      "field": "merchant.name",  
      "message": "Merchant name should not be empty"  
    },  
    {  
      "field": "user.password",  
      "message": "Password must be at least 8 characters"  
    },  
    {  
      "field": "user.email",  
      "message": "Email must be a valid email address"  
    }  
  ],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

---

## Update Response Format Section

Update response format di section Auth Module:

### **Auth Module**

#### **POST /auth/register**  
Register new merchant and owner account.

**Headers:** None (public endpoint)

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

**Response:** (lihat di atas)

---

#### **POST /auth/login**  
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

---

#### **POST /auth/logout**  
Logout dari sistem.

**Headers:** `Authorization: Bearer \<token>`

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

#### **GET /auth/me**  
Get current authenticated user.

**Headers:** `Authorization: Bearer \<token>`

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
    "created_at": "2026-08-11T14:30:00.000Z",  
    "updated_at": "2026-08-11T14:30:00.000Z"  
  }  
}  
``  
---

## Business Logic Notes for Register

1. **Transaction:** Register process harus menggunakan database transaction. Jika salah satu gagal, semua rollback.

2. **Flow:**  
   ```  
   Create Merchant  
        ↓  
   Create User (role: OWNER)  
        ↓  
   Generate JWT Token  
        ↓  
   Return response  
   ```

3. **Validation:**  
   - Email harus unique (belum terdaftar)  
   - Merchant name tidak boleh kosong  
   - Password minimal 8 karakter  
   - Email format valid

4. **Auto-assign:**  
   - User pertama selalu role OWNER  
   - OUTLET_ID = null (Owner tidak terikat outlet)  
   - Status = ACTIVE

5. **Security:**  
   - Password harus di-hash sebelum disimpan  
   - Gunakan bcrypt atau argon2

---

## Contoh Flow Register di Frontend

```javascript  
// Register  
const registerData = {  
  merchant: {  
    name: "IndoMart Retail"  
  },  
  user: {  
    name: "John Doe",  
    email: "owner@indomart.com",  
    password: "SecurePassword123!"  
  }  
};

const response = await fetch('/api/v1/auth/register', {  
  method: 'POST',  
  headers: {  
    'Content-Type': 'application/json'  
  },  
  body: JSON.stringify(registerData)  
});

---

### **4.2 Merchant Module**

#### **GET /merchants**  
Get merchant details.

**Headers:** `Authorization: Bearer \<token>`

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Merchant data retrieved",  
  "data": {  
    "merchant_id": "uuid",  
    "name": "IndoMart Retail",  
    "created_at": "2026-01-01T00:00:00.000Z",  
    "updated_at": "2026-01-01T00:00:00.000Z"  
  }  
}  
```

---

#### **PUT /merchants**  
Update merchant details.

**Headers:** `Authorization: Bearer \<token>`

**Request Body:**  
```json  
{  
  "name": "IndoMart Retail Updated"  
}  
```

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Merchant updated successfully",  
  "data": {  
    "merchant_id": "uuid",  
    "name": "IndoMart Retail Updated"  
  }  
}  
```

---

### **4.3 Outlet Module**

#### **GET /outlets**  
Get all outlets (with optional filters).

**Headers:** `Authorization: Bearer \<token>`

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
      "outlet_id": "uuid",  
      "merchant_id": "uuid",  
      "name": "Outlet A - Mall Central",  
      "address": "Jl. Sudirman No. 123, Jakarta",  
      "status": "ACTIVE",  
      "created_at": "2026-01-01T00:00:00.000Z",  
      "updated_at": "2026-01-01T00:00:00.000Z"  
    }  
  ]  
}  
```

---

#### **POST /outlets**  
Create new outlet.

**Headers:** `Authorization: Bearer \<token>`

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
    "outlet_id": "uuid",  
    "merchant_id": "uuid",  
    "name": "Outlet D - New Mall",  
    "address": "Jl. Gatot Subroto No. 45, Jakarta",  
    "status": "ACTIVE"  
  }  
}  
```

---

#### **GET /outlets/{outletId}**  
Get outlet by ID.

**Headers:** `Authorization: Bearer \<token>`

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
    "outlet_id": "uuid",  
    "merchant_id": "uuid",  
    "name": "Outlet A - Mall Central",  
    "address": "Jl. Sudirman No. 123, Jakarta",  
    "status": "ACTIVE"  
  }  
}  
```

---

#### **PUT /outlets/{outletId}**  
Update outlet.

**Headers:** `Authorization: Bearer \<token>`

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
    "outlet_id": "uuid",  
    "name": "Outlet A - Updated",  
    "address": "Jl. Sudirman No. 456, Jakarta",  
    "status": "INACTIVE"  
  }  
}  
```

---

#### **DELETE /outlets/{outletId}**  
Deactivate outlet.

**Headers:** `Authorization: Bearer \<token>`

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

### **4.4 User Module**

#### **GET /users**  
Get all users (with optional filters).

**Headers:** `Authorization: Bearer \<token>`

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
      "user_id": "uuid",  
      "merchant_id": "uuid",  
      "outlet_id": "uuid",  
      "name": "Budi Santoso",  
      "email": "budi@example.com",  
      "role": "CASHIER",  
      "status": "ACTIVE",  
      "created_at": "2026-01-01T00:00:00.000Z",  
      "updated_at": "2026-01-01T00:00:00.000Z"  
    }  
  ]  
}  
```

---

#### **POST /users**  
Create new user.

**Headers:** `Authorization: Bearer \<token>`

**Request Body:**  
```json  
{  
  "name": "Ani Wijaya",  
  "email": "ani@example.com",  
  "password": "password123",  
  "role": "CASHIER",  
  "outlet_id": "uuid",  // Required for CASHIER, nullable for OWNER/ADMIN  
  "status": "ACTIVE"  
}  
```

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "User created successfully",  
  "data": {  
    "user_id": "uuid",  
    "merchant_id": "uuid",  
    "outlet_id": "uuid",  
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
  "errors": [],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **GET /users/{userId}**  
Get user by ID.

**Headers:** `Authorization: Bearer \<token>`

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
    "user_id": "uuid",  
    "merchant_id": "uuid",  
    "outlet_id": "uuid",  
    "name": "Ani Wijaya",  
    "email": "ani@example.com",  
    "role": "CASHIER",  
    "status": "ACTIVE"  
  }  
}  
```

---

#### **PUT /users/{userId}**  
Update user.

**Headers:** `Authorization: Bearer \<token>`

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
  "outlet_id": "uuid",  
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
    "user_id": "uuid",  
    "name": "Ani Wijaya Updated",  
    "email": "ani.updated@example.com",  
    "role": "ADMIN",  
    "status": "INACTIVE"  
  }  
}  
```

---

#### **DELETE /users/{userId}**  
Deactivate user.

**Headers:** `Authorization: Bearer \<token>`

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

### **4.5 Category Module**

#### **GET /categories**  
Get all categories.

**Headers:** `Authorization: Bearer \<token>`

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Categories retrieved successfully",  
  "data": [  
    {  
      "category_id": "uuid",  
      "merchant_id": "uuid",  
      "name": "Beverages",  
      "created_at": "2026-01-01T00:00:00.000Z",  
      "updated_at": "2026-01-01T00:00:00.000Z"  
    }  
  ]  
}  
```

---

#### **POST /categories**  
Create new category.

**Headers:** `Authorization: Bearer \<token>`

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
    "category_id": "uuid",  
    "merchant_id": "uuid",  
    "name": "Snacks"  
  }  
}  
```

---

#### **PUT /categories/{categoryId}**  
Update category.

**Headers:** `Authorization: Bearer \<token>`

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
    "category_id": "uuid",  
    "name": "Snacks & Chips"  
  }  
}  
```

---

#### **DELETE /categories/{categoryId}**  
Deactivate category (**soft delete**, bukan hapus fisik — FR-CAT-010). Category nonaktif tidak dapat dipilih untuk Product baru, namun relasi Product & riwayat yang ada tetap utuh.

**Headers:** `Authorization: Bearer \<token>`

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

### **4.6 Product Module**

#### **GET /products**  
Get all products with pagination and filters.

**Headers:** `Authorization: Bearer \<token>`

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
        "product_id": "uuid",  
        "merchant_id": "uuid",  
        "category_id": "uuid",  
        "name": "Coca Cola 1.5L",  
        "sku": "CC-1500",  
        "price": 15000,  
        "status": "ACTIVE",  
        "created_at": "2026-01-01T00:00:00.000Z",  
        "updated_at": "2026-01-01T00:00:00.000Z",  
        "category": {  
          "category_id": "uuid",  
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

#### **POST /products**  
Create new product.

**Headers:** `Authorization: Bearer \<token>`

**Request Body:**  
```json  
{  
  "name": "Sprite 1.5L",  
  "sku": "SP-1500",  
  "price": 15000,  
  "category_id": "uuid",  
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
    "product_id": "uuid",  
    "merchant_id": "uuid",  
    "category_id": "uuid",  
    "name": "Sprite 1.5L",  
    "sku": "SP-1500",  
    "price": 15000,  
    "status": "ACTIVE"  
  }  
}  
```

---

#### **GET /products/{productId}**  
Get product by ID.

**Headers:** `Authorization: Bearer \<token>`

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
    "product_id": "uuid",  
    "merchant_id": "uuid",  
    "category_id": "uuid",  
    "name": "Coca Cola 1.5L",  
    "sku": "CC-1500",  
    "price": 15000,  
    "status": "ACTIVE",  
    "category": {  
      "category_id": "uuid",  
      "name": "Beverages"  
    }  
  }  
}  
```

---

#### **PUT /products/{productId}**  
Update product.

**Headers:** `Authorization: Bearer \<token>`

**Path Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `productId` | uuid | Product ID |

**Request Body:**  
```json  
{  
  "name": "Coca Cola 2L",  
  "sku": "CC-2000",  
  "price": 18000,  
  "category_id": "uuid",  
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
    "product_id": "uuid",  
    "name": "Coca Cola 2L",  
    "sku": "CC-2000",  
    "price": 18000,  
    "status": "ACTIVE"  
  }  
}  
```

---

#### **DELETE /products/{productId}**  
Deactivate product.

**Headers:** `Authorization: Bearer \<token>`

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

### **4.7 Inventory Module**

#### **GET /inventory**  
Get inventory by outlet.

**Headers:** `Authorization: Bearer \<token>`

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
        "inventory_id": "uuid",  
        "outlet_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 20,  
        "updated_at": "2026-08-11T14:30:00.000Z",  
        "product": {  
          "product_id": "uuid",  
          "name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "price": 15000  
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

#### **GET /inventory/outlet/{outletId}/product/{productId}**  
Get inventory by outlet and product.

**Headers:** `Authorization: Bearer \<token>`

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
    "inventory_id": "uuid",  
    "outlet_id": "uuid",  
    "product_id": "uuid",  
    "quantity": 20,  
    "updated_at": "2026-08-11T14:30:00.000Z"  
  }  
}  
```

---

#### **PUT /inventory/{inventoryId}**  
Update inventory quantity. **`reason` wajib** untuk setiap adjustment manual (FR-INV-003). Perubahan dicatat di `StockMovement` (before/after/delta/reason/actor/timestamp).

**Headers:** `Authorization: Bearer \<token>`

**Path Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `inventoryId` | uuid | Inventory ID |

**Request Body:**  
```json  
{  
  "quantity": 25,  
  "reason": "Stock opname bulanan"  
}  
```

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Inventory updated successfully",  
  "data": {  
    "inventory_id": "uuid",  
    "outlet_id": "uuid",  
    "product_id": "uuid",  
    "quantity": 25,  
    "before": 20,  
    "after": 25,  
    "delta": 5,  
    "reason": "Stock opname bulanan",  
    "updated_at": "2026-08-11T14:30:00.000Z"  
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
  "errors": [],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **PUT /inventory/bulk**  
Bulk update inventory quantities.

**Headers:** `Authorization: Bearer \<token>`

**Description:**  
Update multiple inventory items in one request (Admin only). Setiap item wajib menyertakan `reason`.

**Request Body:**  
```json  
{  
  "items": [  
    {  
      "inventory_id": "uuid",  
      "quantity": 25,  
      "reason": "Stock opname bulanan"  
    },  
    {  
      "inventory_id": "uuid",  
      "quantity": 10,  
      "reason": "Barang rusak dibuang"  
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
      "inventory_id": "uuid",  
      "outlet_id": "uuid",  
      "product_id": "uuid",  
      "quantity": 25,  
      "before": 20,  
      "after": 25,  
      "delta": 5,  
      "reason": "Stock opname bulanan",  
      "updated_at": "2026-08-11T14:30:00.000Z"  
    }  
  ]  
}  
```

---

#### **POST /inventory/transfer**  
Transfer stock between outlets.

**Headers:** `Authorization: Bearer \<token>`

**Description:**  
Move stock from one outlet to another (Admin only).

**Request Body:**  
```json  
{  
  "product_id": "uuid",  
  "from_outlet_id": "uuid",  
  "to_outlet_id": "uuid",  
  "quantity": 5  
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
      "inventory_id": "uuid",  
      "outlet_id": "uuid",  
      "product_id": "uuid",  
      "quantity": 15  
    },  
    "to_inventory": {  
      "inventory_id": "uuid",  
      "outlet_id": "uuid",  
      "product_id": "uuid",  
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
  "message": "Insufficient stock or invalid transfer",  
  "errors": null,  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **GET /inventory/low-stock**  
Get low stock alerts across all outlets. Threshold default dari **`Merchant.low_stock_threshold`** (satu threshold global nonnegatif per Merchant, berlaku untuk semua Outlet — FR-INV-008 / DR-011A).

**Headers:** `Authorization: Bearer \<token>`

**Query Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `outlet_id` | uuid | Filter by outlet (optional) |  
| `threshold` | integer | Custom threshold (optional; default: `Merchant.low_stock_threshold`) |

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Low stock alerts",  
  "data": [  
    {  
      "inventory_id": "uuid",  
      "product_id": "uuid",  
      "product_name": "Coca Cola 1.5L",  
      "sku": "CC-1500",  
      "outlet_id": "uuid",  
      "outlet_name": "Outlet A - Mall Central",  
      "current_stock": 5,  
      "threshold": 10  
    }  
  ]  
}  
```

---

### **4.8 Cart Module**

#### **GET /cart**  
Get current user's cart.

**Headers:** `Authorization: Bearer \<token>`

**Description:**  
Returns the active cart for the authenticated cashier.

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Cart details",  
  "data": {  
    "cart_id": "uuid",  
    "outlet_id": "uuid",  
    "user_id": "uuid",  
    "created_at": "2026-08-11T14:30:00.000Z",  
    "updated_at": "2026-08-11T14:30:00.000Z",  
    "items": [  
      {  
        "cart_item_id": "uuid",  
        "cart_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 2,  
        "unit_price": 15000,  
        "subtotal": 30000,  
        "product": {  
          "product_id": "uuid",  
          "name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "price": 15000  
        }  
      }  
    ],  
    "subtotal": 30000,  
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
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **POST /cart/items**  
Add item to cart.

**Headers:** `Authorization: Bearer \<token>`

**Description:**  
Add a product to the current cart (Cashier only).

**Request Body:**  
```json  
{  
  "product_id": "uuid",  
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
    "cart_id": "uuid",  
    "outlet_id": "uuid",  
    "user_id": "uuid",  
    "items": [  
      {  
        "cart_item_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 2,  
        "unit_price": 15000,  
        "subtotal": 30000  
      }  
    ],  
    "subtotal": 30000,  
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
  "errors": null,  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **PUT /cart/items/{cartItemId}**  
Update cart item quantity.

**Headers:** `Authorization: Bearer \<token>`

**Path Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `cartItemId` | uuid | Cart item ID |

**Request Body:**  
```json  
{  
  "quantity": 0  
}  
```

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Cart item updated",  
  "data": {  
    "cart_id": "uuid",  
    "items": [  
      {  
        "cart_item_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 3,  
        "unit_price": 15000,  
        "subtotal": 45000  
      }  
    ],  
    "subtotal": 45000,  
    "total_items": 1  
  }  
}  
```

---

#### **DELETE /cart/items/{cartItemId}**  
Remove item from cart.

**Headers:** `Authorization: Bearer \<token>`

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
    "cart_id": "uuid",  
    "items": [],  
    "subtotal": 0,  
    "total_items": 0  
  }  
}  
```

---

#### **DELETE /cart/clear**  
Clear all items from cart.

**Headers:** `Authorization: Bearer \<token>`

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Cart cleared",  
  "data": {  
    "cart_id": "uuid",  
    "items": [],  
    "subtotal": 0,  
    "total_items": 0  
  }  
}  
```

---

### **4.9 Transaction Module**

#### **GET /transactions**  
Get transactions with filters and pagination.

**Headers:** `Authorization: Bearer \<token>`

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
        "transaction_id": "uuid",  
        "outlet_id": "uuid",  
        "user_id": "uuid",  
        "transaction_number": "TRX-20260811-001",  
        "subtotal": 150000,  
        "total": 150000,  
        "status": "COMPLETED",  
        "created_at": "2026-08-11T14:30:00.000Z",  
        "outlet": {  
          "outlet_id": "uuid",  
          "name": "Outlet A - Mall Central"  
        },  
        "cashier": {  
          "user_id": "uuid",  
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

#### **POST /transactions**  
Create new transaction (checkout). Wajib menyertakan `idempotency_key` (FR-CHK-001) dan `payment_method` (`CASH` atau `CASHLESS_MANUAL`; MVP hanya mencatat pembayaran, tidak ada payment gateway — FR-PAY-001, ASM-008).

**Headers:** `Authorization: Bearer \<token>`

**Request Body:**  
```json  
{  
  "idempotency_key": "uuid-or-unique-string-per-attempt",  
  "payment_method": "CASH",  
  "items": [  
    {  
      "product_id": "uuid",  
      "quantity": 2  
    },  
    {  
      "product_id": "uuid",  
      "quantity": 1  
    }  
  ]  
}  
```

Atau menggunakan cart yang sudah ada:
```json  
{  
  "idempotency_key": "uuid-or-unique-string-per-attempt",  
  "payment_method": "CASHLESS_MANUAL",  
  "cart_id": "uuid"  
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
      "transaction_id": "uuid",  
      "outlet_id": "uuid",  
      "user_id": "uuid",  
      "transaction_number": "TRX-20260811-002",  
      "subtotal": 45000,  
      "total": 45000,  
      "status": "COMPLETED",  
      "created_at": "2026-08-11T14:35:00.000Z"  
    },  
    "items": [  
      {  
        "transaction_item_id": "uuid",  
        "transaction_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 2,  
        "unit_price": 15000,  
        "subtotal": 30000  
      },  
      {  
        "transaction_item_id": "uuid",  
        "transaction_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 1,  
        "unit_price": 15000,  
        "subtotal": 15000  
      }  
    ],  
    "payment": {  
      "payment_id": "uuid",  
      "payment_method": "CASH",  
      "amount": 45000,  
      "status": "CONFIRMED",  
      "idempotency_key": "uuid-or-unique-string-per-attempt",  
      "paid_at": "2026-08-11T14:35:00.000Z"  
    },  
    "receipt": {  
      "receipt_number": "RC-20260811-002",  
      "transaction_id": "uuid",  
      "issued_at": "2026-08-11T14:35:00.000Z"  
    }  
  }  
}  
```

**Response (Idempotent replay — transaksi sama dikembalikan, tidak diproses ulang):**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Transaction already exists for this idempotency key",  
  "data": {  
    "transaction": {  
      "transaction_id": "uuid",  
      "transaction_number": "TRX-20260811-002",  
      "total": 45000,  
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
      "product_id": "uuid",  
      "product_name": "Coca Cola 1.5L",  
      "requested": 5,  
      "available": 3  
    }  
  ],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

**Error Response (Product tidak aktif / harga berubah):**  
```json  
{  
  "success": false,  
  "statusCode": 409,  
  "path": "/api/v1/transactions",  
  "message": "Cart validation failed",  
  "errors": [  
    {  
      "code": "PRICE_CHANGED",  
      "product_id": "uuid",  
      "product_name": "Coca Cola 1.5L"  
    }  
  ],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **GET /transactions/{transactionId}**  
Get transaction by ID.

**Headers:** `Authorization: Bearer \<token>`

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
      "transaction_id": "uuid",  
      "outlet_id": "uuid",  
      "user_id": "uuid",  
      "transaction_number": "TRX-20260811-002",  
      "subtotal": 45000,  
      "total": 45000,  
      "status": "COMPLETED",  
      "created_at": "2026-08-11T14:35:00.000Z"  
    },  
    "items": [  
      {  
        "transaction_item_id": "uuid",  
        "product_id": "uuid",  
        "quantity": 2,  
        "unit_price": 15000,  
        "subtotal": 30000,  
        "product": {  
          "product_id": "uuid",  
          "name": "Coca Cola 1.5L",  
          "sku": "CC-1500"  
        }  
      }  
    ]  
  }  
}  
```

---

#### **POST /transactions/{transactionId}/cancel** — 🔮 FUTURE / DI LUAR SCOPE MVP  
Refund/void transaksi final **di luar Must** (ASM-007, OD-005). Endpoint ini **belum tersedia** di Iterasi 1. Jika kelak ditambahkan, sistem harus membuat reversal/audit record tanpa mengubah transaksi final (FR-TRX-008).

**Headers:** `Authorization: Bearer \<token>`

**Path Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `transactionId` | uuid | Transaction ID |

**Response (belum tersedia — dokumentasi untuk masa depan):**  
```json  
{  
  "success": false,  
  "statusCode": 501,  
  "path": "/api/v1/transactions/{transactionId}/cancel",  
  "message": "Not implemented in MVP",  
  "errors": [],  
  "timestamp": "2026-08-11T14:35:00.000Z"  
}  
```

---

### **4.10 Dashboard Module**

#### **GET /dashboard/owner**  
Get complete Owner dashboard data (SINGLE ENDPOINT).

**Headers:** `Authorization: Bearer \<token>`

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
      "total_revenue": 15750000,  
      "total_transactions": 1250,  
      "total_orders": 1250,  
      "average_order_value": 12600,  
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
        "revenue": [2100000, 1800000, 2250000, 1950000, 2400000, 2700000, 2550000],  
        "transactions": [180, 150, 190, 165, 210, 230, 220]  
      },  
      "summary": {  
        "highest_revenue": 2700000,  
        "lowest_revenue": 1800000,  
        "average_revenue": 2250000,  
        "total_revenue": 15750000  
      }  
    },  
    "outlet_performance": [  
      {  
        "outlet_id": "uuid-1",  
        "outlet_name": "Outlet A - Mall Central",  
        "total_revenue": 7250000,  
        "total_transactions": 580,  
        "average_order_value": 12500,  
        "total_products_sold": 1520,  
        "contribution_percentage": 46.03,  
        "revenue_growth": 15.2  
      },  
      {  
        "outlet_id": "uuid-2",  
        "outlet_name": "Outlet B - City Plaza",  
        "total_revenue": 5300000,  
        "total_transactions": 420,  
        "average_order_value": 12619,  
        "total_products_sold": 1150,  
        "contribution_percentage": 33.65,  
        "revenue_growth": 8.7  
      }  
    ],  
    "top_products": {  
      "by_revenue": [  
        {  
          "product_id": "uuid",  
          "product_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "category_name": "Beverages",  
          "total_quantity_sold": 450,  
          "total_revenue": 6750000,  
          "rank": 1  
        },  
        {  
          "product_id": "uuid",  
          "product_name": "Sprite 1.5L",  
          "sku": "SP-1500",  
          "category_name": "Beverages",  
          "total_quantity_sold": 380,  
          "total_revenue": 5700000,  
          "rank": 2  
        }  
      ],  
      "by_quantity": [  
        {  
          "product_id": "uuid",  
          "product_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "category_name": "Beverages",  
          "total_quantity_sold": 450,  
          "total_revenue": 6750000,  
          "rank": 1  
        }  
      ]  
    },  
    "underperforming_products": [  
      {  
        "product_id": "uuid",  
        "product_name": "Premium Coffee Beans",  
        "sku": "PCB-001",  
        "category_name": "Coffee",  
        "total_quantity_sold": 5,  
        "total_revenue": 175000,  
        "stock_level": 50,  
        "days_without_sale": 14,  
        "recommendation": "PROMOTION"  
      }  
    ],  
    "time_pattern": {  
      "hourly_distribution": [  
        {"hour": 8, "revenue": 150000, "transaction_count": 12},  
        {"hour": 9, "revenue": 250000, "transaction_count": 20},  
        {"hour": 12, "revenue": 450000, "transaction_count": 35},  
        {"hour": 13, "revenue": 420000, "transaction_count": 32},  
        {"hour": 19, "revenue": 500000, "transaction_count": 38},  
        {"hour": 20, "revenue": 480000, "transaction_count": 36}  
      ],  
      "peak_hours": [12, 13, 19, 20],  
      "busiest_day": "Saturday",  
      "quietest_day": "Monday",  
      "insights": [  
        "Peak sales occur between 12:00-13:00 and 19:00-20:00",  
        "Saturday shows the highest transaction volume",  
        "Monday has the lowest sales activity"  
      ]  
    },  
    "stock_alerts": {  
      "low_stock": [  
        {  
          "product_id": "uuid",  
          "product_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "outlet_id": "uuid",  
          "outlet_name": "Outlet A - Mall Central",  
          "current_stock": 5,  
          "minimum_stock": 10,  
          "days_until_empty": 2  
        }  
      ],  
      "out_of_stock": [  
        {  
          "product_id": "uuid",  
          "product_name": "Mineral Water 600ml",  
          "sku": "MW-600",  
          "outlet_id": "uuid",  
          "outlet_name": "Outlet B - City Plaza",  
          "last_sold_date": "2026-08-05T14:30:00.000Z"  
        }  
      ]  
    },  
    "aov_trend": {  
      "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],  
      "values": [11200, 11800, 12500, 12600],  
      "current_aov": 12600,  
      "previous_aov": 11800,  
      "growth_percentage": 6.78  
    },  
    "recent_transactions": [  
      {  
        "transaction_id": "uuid",  
        "transaction_number": "TRX-20260811-001",  
        "outlet_name": "Outlet A - Mall Central",  
        "cashier_name": "Budi Santoso",  
        "total": 150000,  
        "created_at": "2026-08-11T14:30:00.000Z"  
      },  
      {  
        "transaction_id": "uuid",  
        "transaction_number": "TRX-20260811-002",  
        "outlet_name": "Outlet B - City Plaza",  
        "cashier_name": "Siti Rahayu",  
        "total": 75000,  
        "created_at": "2026-08-11T14:25:00.000Z"  
      }  
    ],  
    "merchant_overview": {  
      "merchant_name": "IndoMart Retail",  
      "total_outlets_active": 3,  
      "total_employees_active": 12,  
      "total_products_active": 156,  
      "total_categories": 8,  
      "last_ai_analysis": "2026-08-10T08:00:00.000Z",  
      "ai_available_today": true  
    },  
    "period_comparison": {  
      "current_period": {  
        "start_date": "2026-08-01",  
        "end_date": "2026-08-11",  
        "total_revenue": 15750000,  
        "total_transactions": 1250  
      },  
      "previous_period": {  
        "start_date": "2026-07-21",  
        "end_date": "2026-07-31",  
        "total_revenue": 14000000,  
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

#### **GET /dashboard/admin**  
Get Admin dashboard data.

**Headers:** `Authorization: Bearer \<token>`

**Description:**  
Dashboard for Admin - operational management overview. Only Admin and Owner can access.

**Query Parameters:**  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| `outlet_id` | uuid | Filter by specific outlet (optional) |  
| `date` | date | Date for dashboard (default: today) |

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Admin dashboard data",  
  "data": {  
    "summary": {  
      "today_revenue": 2500000,  
      "today_transactions": 180,  
      "today_orders": 180,  
      "month_revenue": 15750000,  
      "month_transactions": 1250,  
      "average_order_value": 12600,  
      "total_products": 156,  
      "total_outlets": 3,  
      "total_employees": 12,  
      "total_categories": 8  
    },  
    "outlet_quick_stats": [  
      {  
        "outlet_id": "uuid-1",  
        "outlet_name": "Outlet A - Mall Central",  
        "today_revenue": 1200000,  
        "today_transactions": 80,  
        "month_revenue": 7250000,  
        "month_transactions": 580,  
        "active_cashiers": 4,  
        "total_products": 120,  
        "low_stock_count": 3  
      }  
    ],  
    "recent_transactions": [  
      {  
        "transaction_id": "uuid",  
        "transaction_number": "TRX-20260811-001",  
        "outlet_name": "Outlet A - Mall Central",  
        "cashier_name": "Budi Santoso",  
        "total": 150000,  
        "created_at": "2026-08-11T14:30:00.000Z"  
      }  
    ],  
    "low_stock_alerts": [  
      {  
        "product_id": "uuid",  
        "product_name": "Coca Cola 1.5L",  
        "sku": "CC-1500",  
        "outlet_id": "uuid",  
        "outlet_name": "Outlet A - Mall Central",  
        "current_stock": 5,  
        "minimum_stock": 10  
      }  
    ],  
    "category_distribution": [  
      {  
        "category_id": "uuid",  
        "category_name": "Beverages",  
        "product_count": 40  
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
  "message": "Only Admin and Owner can access this endpoint",  
  "errors": null,  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

### **4.11 Analytics Module**

#### **GET /analytics/sales-trend**  
Get sales trend data for charts.

**Headers:** `Authorization: Bearer \<token>`

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
        "total_sales": 2100000,  
        "transaction_count": 180  
      },  
      {  
        "date": "2026-08-02",  
        "total_sales": 1800000,  
        "transaction_count": 150  
      }  
    ],  
    "summary": {  
      "total_revenue": 15750000,  
      "average_daily_revenue": 2250000,  
      "total_transactions": 1250,  
      "average_daily_transactions": 178  
    }  
  }  
}  
```

---

#### **GET /analytics/time-pattern**  
Get hourly sales distribution pattern.

**Headers:** `Authorization: Bearer \<token>`

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
      {"hour": 8, "revenue": 150000, "transaction_count": 12},  
      {"hour": 9, "revenue": 250000, "transaction_count": 20},  
      {"hour": 10, "revenue": 180000, "transaction_count": 15}  
    ],  
    "peak_hours": [12, 13, 19, 20],  
    "average_transactions_per_hour": 35  
  }  
}  
```

---

#### **GET /analytics/aov-trend**  
Get Average Order Value trend.

**Headers:** `Authorization: Bearer \<token>`

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
      {"period": "Week 1", "aov": 11200, "transaction_count": 280},  
      {"period": "Week 2", "aov": 11800, "transaction_count": 310},  
      {"period": "Week 3", "aov": 12500, "transaction_count": 330},  
      {"period": "Week 4", "aov": 12600, "transaction_count": 330}  
    ],  
    "overall_aov": 12600,  
    "aov_change_percentage": 6.78  
  }  
}  
```

---

#### **GET /analytics/product-performance**  
Get product performance analysis (best/worst sellers).

**Headers:** `Authorization: Bearer \<token>`

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
        "product_id": "uuid",  
        "product_name": "Coca Cola 1.5L",  
        "sku": "CC-1500",  
        "category_name": "Beverages",  
        "total_sold": 450,  
        "total_revenue": 6750000,  
        "rank": 1  
      }  
    ],  
    "underperformers": [  
      {  
        "product_id": "uuid",  
        "product_name": "Premium Coffee Beans",  
        "sku": "PCB-001",  
        "category_name": "Coffee",  
        "total_sold": 5,  
        "total_revenue": 175000,  
        "rank": 1  
      }  
    ]  
  }  
}  
```

---

### **4.12 AI Insight Module**

#### **POST /ai-insights/analyze**  
Trigger AI analysis (manual by Owner only). Tidak ada batas harian — Owner dapat memicu kapan saja (FR-AI-012, ASM-010).

**Headers:** `Authorization: Bearer \<token>`

**Response (Accepted):**  
```json  
{  
  "success": true,  
  "statusCode": 202,  
  "message": "AI analysis started",  
  "data": {  
    "job_id": "bull-job-12345",  
    "status": "PROCESSING",  
    "message": "AI analysis is being processed. Results will be available shortly."  
  }  
}  
```

**Response (Job masih berjalan — idempotent):**  
```json  
{  
  "success": false,  
  "statusCode": 409,  
  "path": "/api/v1/ai-insights/analyze",  
  "message": "AI analysis is already in progress",  
  "errors": [],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

**Response (Not Authorized):**  
```json  
{  
  "success": false,  
  "statusCode": 403,  
  "path": "/api/v1/ai-insights/analyze",  
  "message": "Only Owner can trigger AI analysis",  
  "errors": [],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

#### **GET /ai-insights**  
Get the current AI insight for merchant. **Hanya OWNER** yang dapat melihat insight (FR-AI-012, URS §8).

Hubungan Merchant → AI Insight bersifat **1:1** dan sistem **tidak menyimpan histori**. Endpoint ini mengembalikan hasil analisis terakhir, bukan daftar.

**Headers:** `Authorization: Bearer \<token>`

**Response:**  
```json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "AI insight retrieved",  
  "data": {  
    "insight_id": "uuid",  
    "merchant_id": "uuid",  
    "title": "Low Stock Alert: Coca Cola 1.5L",  
    "content": "Stock for Coca Cola 1.5L at Outlet A will run out in 2 days based on current sales velocity. Consider restocking 50 units.",  
    "type": "STOCK_WARNING",  
    "status": "READY",  
    "created_at": "2026-08-11T08:00:00.000Z",  
    "updated_at": "2026-08-11T08:00:00.000Z"  
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
  "errors": [],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
```

---

## 5. **HTTP Status Codes**

| Status Code | Description |  
|-------------|-------------|  
| 200 | Success |  
| 201 | Created |  
| 202 | Accepted (for async operations) |  
| 400 | Bad Request |  
| 401 | Unauthorized |  
| 403 | Forbidden |  
| 404 | Not Found |  
| 500 | Internal Server Error |

---

## 6. **Role-Based Access Control (RBAC)**

| Endpoint | Method | OWNER | ADMIN | CASHIER |  
|----------|--------|-------|-------|---------|  
| `/auth/login` | POST | ✅ | ✅ | ✅ |  
| `/auth/me` | GET | ✅ | ✅ | ✅ |  
| `/merchants` | GET/PUT | ✅ | ❌ | ❌ |  
| `/outlets` | GET/POST/PUT/DELETE | ✅ | ❌ | ❌ |  
| `/users` | GET/POST/PUT/DELETE | ✅ | ❌ | ❌ |  
| `/categories` | GET/POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| `/products` | GET | ✅ | ✅ | ✅ |  
| `/products` | POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| `/inventory` | GET | ✅ | ✅ | ✅ |  
| `/inventory` | PUT | ✅ | ✅ | ❌ |  
| `/inventory/bulk` | PUT | ✅ | ✅ | ❌ |  
| `/inventory/transfer` | POST | ✅ | ✅ | ❌ |  
| `/inventory/low-stock` | GET | ✅ | ✅ | ❌ |  
| `/cart` | GET | ❌ | ❌ | ✅ |  
| `/cart/items` | POST | ❌ | ❌ | ✅ |  
| `/cart/items/{cartItemId}` | PUT/DELETE | ❌ | ❌ | ✅ |  
| `/cart/clear` | DELETE | ❌ | ❌ | ✅ |  
| `/transactions` | GET | ✅ | ✅ | ✅ (own outlet only) |  
| `/transactions` | POST | ❌ | ❌ | ✅ |  
| `/transactions/{id}/cancel` | POST | 🔮 Future / di luar scope MVP | | |  
| `/dashboard/owner` | GET | ✅ | ❌ | ❌ |  
| `/dashboard/admin` | GET | ✅ | ✅ | ❌ |  
| `/analytics/*` | GET | ✅ | ✅ | ❌ |  
| `/ai-insights/analyze` | POST | ✅ | ❌ | ❌ |  
| `/ai-insights` | GET | ✅ | ❌ | ❌ |

> **Catatan checkout:** Cart & `POST /transactions` (checkout) hanya untuk **CASHIER** (OD-010, FR-CHK-005 — deliverables: flow wajib checkout hanya Kasir pada outlet tugasnya; Owner/Admin checkout bukan Must dan belum diputuskan). `GET /transactions` tersedia untuk semua role (CASHIER dibatasi outlet sendiri — FR-TRX-001, FR-TRX-004).

---

## 7. **Notes**

1. **Dashboard Endpoint:** `/dashboard/owner` returns all Owner dashboard data in one response; `/dashboard/admin` provides the Admin operational overview.  
2. **Read Replica:** All `GET` endpoints should use Read Replica for better performance.  
3. **Write Operations:** `POST`, `PUT`, `DELETE`, `PATCH` operations use Primary Database.  
4. **AI Analysis:** Tidak ada limit harian (FR-AI-012, ASM-010) — manual trigger oleh OWNER, async via worker; insight hanya **saran** dan tidak mengubah data.  
5. **Transaction Consistency:** Checkout memakai `idempotency_key` + payment method (`CASH`/`CASHLESS_MANUAL`) dan semua operasi (transaction + payment + stock deduction + receipt) dalam satu database transaction untuk menjamin konsistensi dan mencegah double-charge. Refund/void transaksi final di luar scope MVP (ASM-007).  
6. **Inventory Audit:** Setiap perubahan stok (adjustment manual, sale, transfer) wajib mencatat `StockMovement` (before/after/delta/reason/actor/timestamp).  
7. **Authentication:** All endpoints (except login) require valid JWT token.

---

**End of Document** 📄

---

Ini udah lengkap semua ya! Formatnya dokumen laporan yang bisa langsung dibaca. Ada semua endpoint dari Auth sampai AI Insight, lengkap dengan contoh request/response dan RBAC-nya. 🚀  
