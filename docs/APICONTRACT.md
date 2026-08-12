\---

\# 📋 \*\*POS System \- API Contract Documentation\*\*

\*\*Version:\*\* 1.0.0    
\*\*Base URL:\*\* \`https://api.pos-system.com/api/v1\`    
\*\*Last Updated:\*\* August 11, 2026

\---

\#\# 📌 \*\*Daftar Isi\*\*

1\. \[Authentication\](\#1-authentication)  
2\. \[Response Format\](\#2-response-format)  
3\. \[Error Response Format\](\#3-error-response-format)  
4\. \[Endpoints\](\#4-endpoints)  
   \- \[Auth Module\](\#41-auth-module)  
   \- \[Merchant Module\](\#42-merchant-module)  
   \- \[Outlet Module\](\#43-outlet-module)  
   \- \[User Module\](\#44-user-module)  
   \- \[Category Module\](\#45-category-module)  
   \- \[Product Module\](\#46-product-module)  
   \- \[Inventory Module\](\#47-inventory-module)  
   \- \[Transaction Module\](\#48-transaction-module)  
   \- \[Dashboard Module\](\#49-dashboard-module)  
   \- \[Analytics Module\](\#410-analytics-module)  
   \- \[AI Insight Module\](\#411-ai-insight-module)

\---

\#\# 1\. \*\*Authentication\*\*

Semua endpoint (kecuali \`/auth/login\`) memerlukan \*\*Bearer Token\*\*:

\`\`\`  
Authorization: Bearer \<jwt\_token\>  
\`\`\`

\---

\#\# 2\. \*\*Response Format\*\*

\#\#\# \*\*Success Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Operation successful",  
  "data": {  
    // Response data goes here (null if no data)  
  }  
}  
\`\`\`

\#\#\# \*\*Pagination Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Data retrieved successfully",  
  "data": {  
    "items": \[\],  
    "total": 100,  
    "page": 1,  
    "limit": 10,  
    "total\_pages": 10  
  }  
}  
\`\`\`

\---

\#\# 3\. \*\*Error Response Format\*\*

\`\`\`json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/products",  
  "message": "Product name is required",  
  "errors": \[  
    {  
      "field": "name",  
      "message": "Name should not be empty"  
    }  
  \],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\#\# 4\. \*\*Endpoints\*\*

\#\#\# \*\*4.1 Auth Module\*\*

Oke bener\! Untuk register, kita buat \*\*1 endpoint khusus\*\* yang langsung register \*\*Merchant \+ Owner\*\* sekaligus. Karena sistemnya single merchant, jadi owner langsung register merchant dan akun owner-nya dalam 1 request.

\---

\#\# Tambahan Endpoint: Register

\---

\#\#\# \*\*POST /auth/register\*\*

Register new merchant and owner account in one request.

\*\*Description:\*\*  
\- Membuat merchant baru sekaligus user dengan role OWNER  
\- User pertama dalam merchant selalu menjadi OWNER  
\- Tidak memerlukan authentication (public endpoint)

\---

\*\*Request Body:\*\*

\`\`\`json  
{  
  "merchant": {  
    "name": "IndoMart Retail"  
  },  
  "user": {  
    "name": "John Doe",  
    "email": "owner@indomart.com",  
    "password": "SecurePassword123\!"  
  }  
}  
\`\`\`

\*\*Field Descriptions:\*\*

| Field | Type | Required | Description |  
|-------|------|----------|-------------|  
| \`merchant.name\` | string | ✅ | Nama merchant/bisnis |  
| \`user.name\` | string | ✅ | Nama lengkap owner |  
| \`user.email\` | string | ✅ | Email owner (unique) |  
| \`user.password\` | string | ✅ | Password (min 8 karakter) |

\---

\*\*Response (201 Created):\*\*

\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "Merchant and owner account created successfully",  
  "data": {  
    "merchant": {  
      "merchant\_id": "550e8400-e29b-41d4-a716-446655440000",  
      "name": "IndoMart Retail",  
      "created\_at": "2026-08-11T14:30:00.000Z",  
      "updated\_at": "2026-08-11T14:30:00.000Z"  
    },  
    "user": {  
      "user\_id": "550e8400-e29b-41d4-a716-446655440001",  
      "merchant\_id": "550e8400-e29b-41d4-a716-446655440000",  
      "outlet\_id": null,  
      "name": "John Doe",  
      "email": "owner@indomart.com",  
      "role": "OWNER",  
      "status": "ACTIVE",  
      "created\_at": "2026-08-11T14:30:00.000Z",  
      "updated\_at": "2026-08-11T14:30:00.000Z"  
    },  
    "access\_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJlbWFpbCI6Im93bmVyQGluZG9tYXJ0LmNvbSIsInJvbGUiOiJPV05FUiIsIm1lcmNoYW50X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwiaWF0IjoxNzI2MDAwMDAwLCJleHAiOjE3MjYwMDM2MDB9.signature"  
  }  
}  
\`\`\`

\---

\*\*Error Response (Email already exists):\*\*

\`\`\`json  
{  
  "success": false,  
  "statusCode": 409,  
  "path": "/api/v1/auth/register",  
  "message": "Email already registered",  
  "errors": \[  
    {  
      "field": "email",  
      "message": "Email owner@indomart.com is already used"  
    }  
  \],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\*\*Error Response (Validation Error):\*\*

\`\`\`json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/auth/register",  
  "message": "Validation failed",  
  "errors": \[  
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
  \],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\---

\#\# Update Response Format Section

Update response format di section Auth Module:

\#\#\# \*\*Auth Module\*\*

\#\#\#\# \*\*POST /auth/register\*\*  
Register new merchant and owner account.

\*\*Headers:\*\* None (public endpoint)

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "merchant": {  
    "name": "IndoMart Retail"  
  },  
  "user": {  
    "name": "John Doe",  
    "email": "owner@indomart.com",  
    "password": "SecurePassword123\!"  
  }  
}  
\`\`\`

\*\*Response:\*\* (lihat di atas)

\---

\#\#\#\# \*\*POST /auth/login\*\*  
Login ke sistem.

\*\*Headers:\*\* None (public endpoint)

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "email": "owner@indomart.com",  
  "password": "SecurePassword123\!"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Login successful",  
  "data": {  
    "access\_token": "eyJhbGciOiJIUzI1NiIs...",  
    "user": {  
      "user\_id": "550e8400-e29b-41d4-a716-446655440001",  
      "merchant\_id": "550e8400-e29b-41d4-a716-446655440000",  
      "outlet\_id": null,  
      "name": "John Doe",  
      "email": "owner@indomart.com",  
      "role": "OWNER",  
      "status": "ACTIVE"  
    }  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /auth/logout\*\*  
Logout dari sistem.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Logout successful",  
  "data": null  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /auth/me\*\*  
Get current authenticated user.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "User data retrieved",  
  "data": {  
    "user\_id": "550e8400-e29b-41d4-a716-446655440001",  
    "merchant\_id": "550e8400-e29b-41d4-a716-446655440000",  
    "outlet\_id": null,  
    "name": "John Doe",  
    "email": "owner@indomart.com",  
    "role": "OWNER",  
    "status": "ACTIVE",  
    "created\_at": "2026-08-11T14:30:00.000Z",  
    "updated\_at": "2026-08-11T14:30:00.000Z"  
  }  
}  
\`\`  
\---

\#\# Business Logic Notes for Register

1\. \*\*Transaction:\*\* Register process harus menggunakan database transaction. Jika salah satu gagal, semua rollback.

2\. \*\*Flow:\*\*  
   \`\`\`  
   Create Merchant  
        ↓  
   Create User (role: OWNER)  
        ↓  
   Generate JWT Token  
        ↓  
   Return response  
   \`\`\`

3\. \*\*Validation:\*\*  
   \- Email harus unique (belum terdaftar)  
   \- Merchant name tidak boleh kosong  
   \- Password minimal 8 karakter  
   \- Email format valid

4\. \*\*Auto-assign:\*\*  
   \- User pertama selalu role OWNER  
   \- OUTLET\_ID \= null (Owner tidak terikat outlet)  
   \- Status \= ACTIVE

5\. \*\*Security:\*\*  
   \- Password harus di-hash sebelum disimpan  
   \- Gunakan bcrypt atau argon2

\---

\#\# Contoh Flow Register di Frontend

\`\`\`javascript  
// Register  
const registerData \= {  
  merchant: {  
    name: "IndoMart Retail"  
  },  
  user: {  
    name: "John Doe",  
    email: "owner@indomart.com",  
    password: "SecurePassword123\!"  
  }  
};

const response \= await fetch('/api/v1/auth/register', {  
  method: 'POST',  
  headers: {  
    'Content-Type': 'application/json'  
  },  
  body: JSON.stringify(registerData)  
});

\---

\#\#\# \*\*4.2 Merchant Module\*\*

\#\#\#\# \*\*GET /merchants\*\*  
Get merchant details.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Merchant data retrieved",  
  "data": {  
    "merchant\_id": "uuid",  
    "name": "IndoMart Retail",  
    "created\_at": "2026-01-01T00:00:00.000Z",  
    "updated\_at": "2026-01-01T00:00:00.000Z"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /merchants\*\*  
Update merchant details.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "IndoMart Retail Updated"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Merchant updated successfully",  
  "data": {  
    "merchant\_id": "uuid",  
    "name": "IndoMart Retail Updated"  
  }  
}  
\`\`\`

\---

\#\#\# \*\*4.3 Outlet Module\*\*

\#\#\#\# \*\*GET /outlets\*\*  
Get all outlets (with optional filters).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`status\` | string | \`ACTIVE\` or \`INACTIVE\` (optional) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Outlets retrieved successfully",  
  "data": \[  
    {  
      "outlet\_id": "uuid",  
      "merchant\_id": "uuid",  
      "name": "Outlet A \- Mall Central",  
      "address": "Jl. Sudirman No. 123, Jakarta",  
      "status": "ACTIVE",  
      "created\_at": "2026-01-01T00:00:00.000Z",  
      "updated\_at": "2026-01-01T00:00:00.000Z"  
    }  
  \]  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /outlets\*\*  
Create new outlet.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Outlet D \- New Mall",  
  "address": "Jl. Gatot Subroto No. 45, Jakarta",  
  "status": "ACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "Outlet created successfully",  
  "data": {  
    "outlet\_id": "uuid",  
    "merchant\_id": "uuid",  
    "name": "Outlet D \- New Mall",  
    "address": "Jl. Gatot Subroto No. 45, Jakarta",  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /outlets/{outletId}\*\*  
Get outlet by ID.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outletId\` | uuid | Outlet ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Outlet data retrieved",  
  "data": {  
    "outlet\_id": "uuid",  
    "merchant\_id": "uuid",  
    "name": "Outlet A \- Mall Central",  
    "address": "Jl. Sudirman No. 123, Jakarta",  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /outlets/{outletId}\*\*  
Update outlet.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outletId\` | uuid | Outlet ID |

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Outlet A \- Updated",  
  "address": "Jl. Sudirman No. 456, Jakarta",  
  "status": "INACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Outlet updated successfully",  
  "data": {  
    "outlet\_id": "uuid",  
    "name": "Outlet A \- Updated",  
    "address": "Jl. Sudirman No. 456, Jakarta",  
    "status": "INACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*DELETE /outlets/{outletId}\*\*  
Deactivate outlet.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outletId\` | uuid | Outlet ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Outlet deactivated successfully",  
  "data": null  
}  
\`\`\`

\---

\#\#\# \*\*4.4 User Module\*\*

\#\#\#\# \*\*GET /users\*\*  
Get all users (with optional filters).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`role\` | string | \`OWNER\`, \`ADMIN\`, or \`CASHIER\` (optional) |  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`status\` | string | \`ACTIVE\` or \`INACTIVE\` (optional) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Users retrieved successfully",  
  "data": \[  
    {  
      "user\_id": "uuid",  
      "merchant\_id": "uuid",  
      "outlet\_id": "uuid",  
      "name": "Budi Santoso",  
      "email": "budi@example.com",  
      "role": "CASHIER",  
      "status": "ACTIVE",  
      "created\_at": "2026-01-01T00:00:00.000Z",  
      "updated\_at": "2026-01-01T00:00:00.000Z"  
    }  
  \]  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /users\*\*  
Create new user.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Ani Wijaya",  
  "email": "ani@example.com",  
  "password": "password123",  
  "role": "CASHIER",  
  "outlet\_id": "uuid",  // Required for CASHIER, nullable for OWNER/ADMIN  
  "status": "ACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "User created successfully",  
  "data": {  
    "user\_id": "uuid",  
    "merchant\_id": "uuid",  
    "outlet\_id": "uuid",  
    "name": "Ani Wijaya",  
    "email": "ani@example.com",  
    "role": "CASHIER",  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\*\*Error Response (Cashier without outlet):\*\*  
\`\`\`json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/users",  
  "message": "outlet\_id is required for CASHIER role",  
  "errors": \[\],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /users/{userId}\*\*  
Get user by ID.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`userId\` | uuid | User ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "User data retrieved",  
  "data": {  
    "user\_id": "uuid",  
    "merchant\_id": "uuid",  
    "outlet\_id": "uuid",  
    "name": "Ani Wijaya",  
    "email": "ani@example.com",  
    "role": "CASHIER",  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /users/{userId}\*\*  
Update user.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`userId\` | uuid | User ID |

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Ani Wijaya Updated",  
  "email": "ani.updated@example.com",  
  "role": "ADMIN",  
  "outlet\_id": "uuid",  
  "status": "INACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "User updated successfully",  
  "data": {  
    "user\_id": "uuid",  
    "name": "Ani Wijaya Updated",  
    "email": "ani.updated@example.com",  
    "role": "ADMIN",  
    "status": "INACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*DELETE /users/{userId}\*\*  
Deactivate user.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`userId\` | uuid | User ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "User deactivated successfully",  
  "data": null  
}  
\`\`\`

\---

\#\#\# \*\*4.5 Category Module\*\*

\#\#\#\# \*\*GET /categories\*\*  
Get all categories.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Categories retrieved successfully",  
  "data": \[  
    {  
      "category\_id": "uuid",  
      "merchant\_id": "uuid",  
      "name": "Beverages",  
      "created\_at": "2026-01-01T00:00:00.000Z",  
      "updated\_at": "2026-01-01T00:00:00.000Z"  
    }  
  \]  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /categories\*\*  
Create new category.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Snacks"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "Category created successfully",  
  "data": {  
    "category\_id": "uuid",  
    "merchant\_id": "uuid",  
    "name": "Snacks"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /categories/{categoryId}\*\*  
Update category.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`categoryId\` | uuid | Category ID |

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Snacks & Chips"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Category updated successfully",  
  "data": {  
    "category\_id": "uuid",  
    "name": "Snacks & Chips"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*DELETE /categories/{categoryId}\*\*  
Delete category.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`categoryId\` | uuid | Category ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Category deleted successfully",  
  "data": null  
}  
\`\`\`

\---

\#\#\# \*\*4.6 Product Module\*\*

\#\#\#\# \*\*GET /products\*\*  
Get all products with pagination and filters.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`category\_id\` | uuid | Filter by category (optional) |  
| \`status\` | string | \`ACTIVE\` or \`INACTIVE\` (optional) |  
| \`search\` | string | Search by name or SKU (optional) |  
| \`page\` | integer | Page number (default: 1\) |  
| \`limit\` | integer | Items per page (default: 10\) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Products retrieved successfully",  
  "data": {  
    "items": \[  
      {  
        "product\_id": "uuid",  
        "merchant\_id": "uuid",  
        "category\_id": "uuid",  
        "name": "Coca Cola 1.5L",  
        "sku": "CC-1500",  
        "price": 15000,  
        "status": "ACTIVE",  
        "created\_at": "2026-01-01T00:00:00.000Z",  
        "updated\_at": "2026-01-01T00:00:00.000Z",  
        "category": {  
          "category\_id": "uuid",  
          "name": "Beverages"  
        }  
      }  
    \],  
    "total": 156,  
    "page": 1,  
    "limit": 10,  
    "total\_pages": 16  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /products\*\*  
Create new product.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Sprite 1.5L",  
  "sku": "SP-1500",  
  "price": 15000,  
  "category\_id": "uuid",  
  "status": "ACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "Product created successfully",  
  "data": {  
    "product\_id": "uuid",  
    "merchant\_id": "uuid",  
    "category\_id": "uuid",  
    "name": "Sprite 1.5L",  
    "sku": "SP-1500",  
    "price": 15000,  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /products/{productId}\*\*  
Get product by ID.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`productId\` | uuid | Product ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Product data retrieved",  
  "data": {  
    "product\_id": "uuid",  
    "merchant\_id": "uuid",  
    "category\_id": "uuid",  
    "name": "Coca Cola 1.5L",  
    "sku": "CC-1500",  
    "price": 15000,  
    "status": "ACTIVE",  
    "category": {  
      "category\_id": "uuid",  
      "name": "Beverages"  
    }  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /products/{productId}\*\*  
Update product.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`productId\` | uuid | Product ID |

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "name": "Coca Cola 2L",  
  "sku": "CC-2000",  
  "price": 18000,  
  "category\_id": "uuid",  
  "status": "ACTIVE"  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Product updated successfully",  
  "data": {  
    "product\_id": "uuid",  
    "name": "Coca Cola 2L",  
    "sku": "CC-2000",  
    "price": 18000,  
    "status": "ACTIVE"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*DELETE /products/{productId}\*\*  
Deactivate product.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`productId\` | uuid | Product ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Product deactivated successfully",  
  "data": null  
}  
\`\`\`

\---

\#\#\# \*\*4.7 Inventory Module\*\*

\#\#\#\# \*\*GET /inventory\*\*  
Get inventory by outlet.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | \*\*Required\*\* \- Outlet ID |  
| \`product\_id\` | uuid | Filter by product (optional) |  
| \`page\` | integer | Page number (default: 1\) |  
| \`limit\` | integer | Items per page (default: 10\) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Inventory retrieved successfully",  
  "data": {  
    "items": \[  
      {  
        "inventory\_id": "uuid",  
        "outlet\_id": "uuid",  
        "product\_id": "uuid",  
        "quantity": 20,  
        "updated\_at": "2026-08-11T14:30:00.000Z",  
        "product": {  
          "product\_id": "uuid",  
          "name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "price": 15000  
        }  
      }  
    \],  
    "total": 50,  
    "page": 1,  
    "limit": 10,  
    "total\_pages": 5  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /inventory/outlet/{outletId}/product/{productId}\*\*  
Get inventory by outlet and product.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outletId\` | uuid | Outlet ID |  
| \`productId\` | uuid | Product ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Inventory data retrieved",  
  "data": {  
    "inventory\_id": "uuid",  
    "outlet\_id": "uuid",  
    "product\_id": "uuid",  
    "quantity": 20,  
    "updated\_at": "2026-08-11T14:30:00.000Z"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*PUT /inventory/{inventoryId}\*\*  
Update inventory quantity.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`inventoryId\` | uuid | Inventory ID |

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "quantity": 25  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Inventory updated successfully",  
  "data": {  
    "inventory\_id": "uuid",  
    "outlet\_id": "uuid",  
    "product\_id": "uuid",  
    "quantity": 25,  
    "updated\_at": "2026-08-11T14:30:00.000Z"  
  }  
}  
\`\`\`

\---

\#\#\# \*\*4.8 Transaction Module\*\*

\#\#\#\# \*\*GET /transactions\*\*  
Get transactions with filters and pagination.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`start\_date\` | date | Start date (YYYY-MM-DD) |  
| \`end\_date\` | date | End date (YYYY-MM-DD) |  
| \`cashier\_id\` | uuid | Filter by cashier (optional) |  
| \`page\` | integer | Page number (default: 1\) |  
| \`limit\` | integer | Items per page (default: 10\) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Transactions retrieved successfully",  
  "data": {  
    "items": \[  
      {  
        "transaction\_id": "uuid",  
        "outlet\_id": "uuid",  
        "user\_id": "uuid",  
        "transaction\_number": "TRX-20260811-001",  
        "subtotal": 150000,  
        "total": 150000,  
        "status": "COMPLETED",  
        "created\_at": "2026-08-11T14:30:00.000Z",  
        "outlet": {  
          "outlet\_id": "uuid",  
          "name": "Outlet A \- Mall Central"  
        },  
        "cashier": {  
          "user\_id": "uuid",  
          "name": "Budi Santoso"  
        }  
      }  
    \],  
    "total": 1250,  
    "page": 1,  
    "limit": 10,  
    "total\_pages": 125  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /transactions\*\*  
Create new transaction (checkout).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Request Body:\*\*  
\`\`\`json  
{  
  "items": \[  
    {  
      "product\_id": "uuid",  
      "quantity": 2  
    },  
    {  
      "product\_id": "uuid",  
      "quantity": 1  
    }  
  \]  
}  
\`\`\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 201,  
  "message": "Transaction completed successfully",  
  "data": {  
    "transaction": {  
      "transaction\_id": "uuid",  
      "outlet\_id": "uuid",  
      "user\_id": "uuid",  
      "transaction\_number": "TRX-20260811-002",  
      "subtotal": 45000,  
      "total": 45000,  
      "status": "COMPLETED",  
      "created\_at": "2026-08-11T14:35:00.000Z"  
    },  
    "items": \[  
      {  
        "transaction\_item\_id": "uuid",  
        "transaction\_id": "uuid",  
        "product\_id": "uuid",  
        "quantity": 2,  
        "unit\_price": 15000,  
        "subtotal": 30000  
      },  
      {  
        "transaction\_item\_id": "uuid",  
        "transaction\_id": "uuid",  
        "product\_id": "uuid",  
        "quantity": 1,  
        "unit\_price": 15000,  
        "subtotal": 15000  
      }  
    \]  
  }  
}  
\`\`\`

\*\*Error Response (Insufficient Stock):\*\*  
\`\`\`json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/transactions",  
  "message": "Insufficient stock for product: Coca Cola 1.5L",  
  "errors": \[  
    {  
      "product\_id": "uuid",  
      "product\_name": "Coca Cola 1.5L",  
      "requested": 5,  
      "available": 3  
    }  
  \],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /transactions/{transactionId}\*\*  
Get transaction by ID.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`transactionId\` | uuid | Transaction ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Transaction data retrieved",  
  "data": {  
    "transaction": {  
      "transaction\_id": "uuid",  
      "outlet\_id": "uuid",  
      "user\_id": "uuid",  
      "transaction\_number": "TRX-20260811-002",  
      "subtotal": 45000,  
      "total": 45000,  
      "status": "COMPLETED",  
      "created\_at": "2026-08-11T14:35:00.000Z"  
    },  
    "items": \[  
      {  
        "transaction\_item\_id": "uuid",  
        "product\_id": "uuid",  
        "quantity": 2,  
        "unit\_price": 15000,  
        "subtotal": 30000,  
        "product": {  
          "product\_id": "uuid",  
          "name": "Coca Cola 1.5L",  
          "sku": "CC-1500"  
        }  
      }  
    \]  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /transactions/{transactionId}/cancel\*\*  
Cancel transaction and restore stock.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Path Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`transactionId\` | uuid | Transaction ID |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Transaction cancelled successfully",  
  "data": {  
    "transaction\_id": "uuid",  
    "status": "CANCELLED",  
    "restored\_stock": true  
  }  
}  
\`\`\`

\---

\#\#\# \*\*4.9 Dashboard Module\*\*

\#\#\#\# \*\*GET /dashboard/owner\*\*  
Get complete Owner dashboard data (SINGLE ENDPOINT).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`period\` | string | \`TODAY\`, \`THIS\_WEEK\`, \`THIS\_MONTH\`, \`THIS\_QUARTER\`, \`THIS\_YEAR\` (default: THIS\_MONTH) |  
| \`outlet\_id\` | uuid | Filter by specific outlet (optional) |

\*\*Response:\*\*

\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Dashboard data retrieved successfully",  
  "data": {  
    "summary": {  
      "total\_revenue": 15750000,  
      "total\_transactions": 1250,  
      "total\_orders": 1250,  
      "average\_order\_value": 12600,  
      "total\_products\_sold": 3420,  
      "total\_outlets": 3,  
      "total\_employees": 12,  
      "total\_products": 156,  
      "revenue\_growth": 12.5,  
      "transactions\_growth": 8.3  
    },  
    "sales\_trend": {  
      "labels": \["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"\],  
      "datasets": {  
        "revenue": \[2100000, 1800000, 2250000, 1950000, 2400000, 2700000, 2550000\],  
        "transactions": \[180, 150, 190, 165, 210, 230, 220\]  
      },  
      "summary": {  
        "highest\_revenue": 2700000,  
        "lowest\_revenue": 1800000,  
        "average\_revenue": 2250000,  
        "total\_revenue": 15750000  
      }  
    },  
    "outlet\_performance": \[  
      {  
        "outlet\_id": "uuid-1",  
        "outlet\_name": "Outlet A \- Mall Central",  
        "total\_revenue": 7250000,  
        "total\_transactions": 580,  
        "average\_order\_value": 12500,  
        "total\_products\_sold": 1520,  
        "contribution\_percentage": 46.03,  
        "revenue\_growth": 15.2  
      },  
      {  
        "outlet\_id": "uuid-2",  
        "outlet\_name": "Outlet B \- City Plaza",  
        "total\_revenue": 5300000,  
        "total\_transactions": 420,  
        "average\_order\_value": 12619,  
        "total\_products\_sold": 1150,  
        "contribution\_percentage": 33.65,  
        "revenue\_growth": 8.7  
      }  
    \],  
    "top\_products": {  
      "by\_revenue": \[  
        {  
          "product\_id": "uuid",  
          "product\_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "category\_name": "Beverages",  
          "total\_quantity\_sold": 450,  
          "total\_revenue": 6750000,  
          "rank": 1  
        },  
        {  
          "product\_id": "uuid",  
          "product\_name": "Sprite 1.5L",  
          "sku": "SP-1500",  
          "category\_name": "Beverages",  
          "total\_quantity\_sold": 380,  
          "total\_revenue": 5700000,  
          "rank": 2  
        }  
      \],  
      "by\_quantity": \[  
        {  
          "product\_id": "uuid",  
          "product\_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "category\_name": "Beverages",  
          "total\_quantity\_sold": 450,  
          "total\_revenue": 6750000,  
          "rank": 1  
        }  
      \]  
    },  
    "underperforming\_products": \[  
      {  
        "product\_id": "uuid",  
        "product\_name": "Premium Coffee Beans",  
        "sku": "PCB-001",  
        "category\_name": "Coffee",  
        "total\_quantity\_sold": 5,  
        "total\_revenue": 175000,  
        "stock\_level": 50,  
        "days\_without\_sale": 14,  
        "recommendation": "PROMOTION"  
      }  
    \],  
    "time\_pattern": {  
      "hourly\_distribution": \[  
        {"hour": 8, "revenue": 150000, "transaction\_count": 12},  
        {"hour": 9, "revenue": 250000, "transaction\_count": 20},  
        {"hour": 12, "revenue": 450000, "transaction\_count": 35},  
        {"hour": 13, "revenue": 420000, "transaction\_count": 32},  
        {"hour": 19, "revenue": 500000, "transaction\_count": 38},  
        {"hour": 20, "revenue": 480000, "transaction\_count": 36}  
      \],  
      "peak\_hours": \[12, 13, 19, 20\],  
      "busiest\_day": "Saturday",  
      "quietest\_day": "Monday",  
      "insights": \[  
        "Peak sales occur between 12:00-13:00 and 19:00-20:00",  
        "Saturday shows the highest transaction volume",  
        "Monday has the lowest sales activity"  
      \]  
    },  
    "stock\_alerts": {  
      "low\_stock": \[  
        {  
          "product\_id": "uuid",  
          "product\_name": "Coca Cola 1.5L",  
          "sku": "CC-1500",  
          "outlet\_id": "uuid",  
          "outlet\_name": "Outlet A \- Mall Central",  
          "current\_stock": 5,  
          "minimum\_stock": 10,  
          "days\_until\_empty": 2  
        }  
      \],  
      "out\_of\_stock": \[  
        {  
          "product\_id": "uuid",  
          "product\_name": "Mineral Water 600ml",  
          "sku": "MW-600",  
          "outlet\_id": "uuid",  
          "outlet\_name": "Outlet B \- City Plaza",  
          "last\_sold\_date": "2026-08-05T14:30:00.000Z"  
        }  
      \]  
    },  
    "aov\_trend": {  
      "labels": \["Week 1", "Week 2", "Week 3", "Week 4"\],  
      "values": \[11200, 11800, 12500, 12600\],  
      "current\_aov": 12600,  
      "previous\_aov": 11800,  
      "growth\_percentage": 6.78  
    },  
    "recent\_transactions": \[  
      {  
        "transaction\_id": "uuid",  
        "transaction\_number": "TRX-20260811-001",  
        "outlet\_name": "Outlet A \- Mall Central",  
        "cashier\_name": "Budi Santoso",  
        "total": 150000,  
        "created\_at": "2026-08-11T14:30:00.000Z"  
      },  
      {  
        "transaction\_id": "uuid",  
        "transaction\_number": "TRX-20260811-002",  
        "outlet\_name": "Outlet B \- City Plaza",  
        "cashier\_name": "Siti Rahayu",  
        "total": 75000,  
        "created\_at": "2026-08-11T14:25:00.000Z"  
      }  
    \],  
    "merchant\_overview": {  
      "merchant\_name": "IndoMart Retail",  
      "total\_outlets\_active": 3,  
      "total\_employees\_active": 12,  
      "total\_products\_active": 156,  
      "total\_categories": 8,  
      "last\_ai\_analysis": "2026-08-10T08:00:00.000Z",  
      "ai\_available\_today": true  
    },  
    "period\_comparison": {  
      "current\_period": {  
        "start\_date": "2026-08-01",  
        "end\_date": "2026-08-11",  
        "total\_revenue": 15750000,  
        "total\_transactions": 1250  
      },  
      "previous\_period": {  
        "start\_date": "2026-07-21",  
        "end\_date": "2026-07-31",  
        "total\_revenue": 14000000,  
        "total\_transactions": 1150  
      },  
      "changes": {  
        "revenue\_percentage": 12.5,  
        "transactions\_percentage": 8.7,  
        "aov\_percentage": 6.78  
      }  
    }  
  }  
}  
\`\`\`

\---

\#\#\# \*\*4.10 Analytics Module\*\*

\#\#\#\# \*\*GET /analytics/sales-trend\*\*  
Get sales trend data for charts.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`start\_date\` | date | \*\*Required\*\* \- Start date (YYYY-MM-DD) |  
| \`end\_date\` | date | \*\*Required\*\* \- End date (YYYY-MM-DD) |  
| \`interval\` | string | \`DAILY\`, \`WEEKLY\`, \`MONTHLY\` (default: DAILY) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Sales trend data retrieved",  
  "data": {  
    "trend": \[  
      {  
        "date": "2026-08-01",  
        "total\_sales": 2100000,  
        "transaction\_count": 180  
      },  
      {  
        "date": "2026-08-02",  
        "total\_sales": 1800000,  
        "transaction\_count": 150  
      }  
    \],  
    "summary": {  
      "total\_revenue": 15750000,  
      "average\_daily\_revenue": 2250000,  
      "total\_transactions": 1250,  
      "average\_daily\_transactions": 178  
    }  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /analytics/time-pattern\*\*  
Get hourly sales distribution pattern.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`period\` | string | \`TODAY\`, \`THIS\_WEEK\`, \`THIS\_MONTH\` (default: THIS\_WEEK) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Time pattern data retrieved",  
  "data": {  
    "patterns": \[  
      {"hour": 8, "revenue": 150000, "transaction\_count": 12},  
      {"hour": 9, "revenue": 250000, "transaction\_count": 20},  
      {"hour": 10, "revenue": 180000, "transaction\_count": 15}  
    \],  
    "peak\_hours": \[12, 13, 19, 20\],  
    "average\_transactions\_per\_hour": 35  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /analytics/aov-trend\*\*  
Get Average Order Value trend.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`period\` | string | \`THIS\_WEEK\`, \`THIS\_MONTH\`, \`THIS\_QUARTER\`, \`THIS\_YEAR\` (default: THIS\_MONTH) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "AOV trend data retrieved",  
  "data": {  
    "trend": \[  
      {"period": "Week 1", "aov": 11200, "transaction\_count": 280},  
      {"period": "Week 2", "aov": 11800, "transaction\_count": 310},  
      {"period": "Week 3", "aov": 12500, "transaction\_count": 330},  
      {"period": "Week 4", "aov": 12600, "transaction\_count": 330}  
    \],  
    "overall\_aov": 12600,  
    "aov\_change\_percentage": 6.78  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /analytics/product-performance\*\*  
Get product performance analysis (best/worst sellers).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Query Parameters:\*\*  
| Parameter | Type | Description |  
|-----------|------|-------------|  
| \`outlet\_id\` | uuid | Filter by outlet (optional) |  
| \`period\` | string | \`THIS\_WEEK\`, \`THIS\_MONTH\`, \`THIS\_QUARTER\` (default: THIS\_MONTH) |  
| \`sort\_by\` | string | \`REVENUE\` or \`QUANTITY\` (default: REVENUE) |  
| \`limit\` | integer | Number of products (default: 10\) |

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "Product performance data retrieved",  
  "data": {  
    "top\_sellers": \[  
      {  
        "product\_id": "uuid",  
        "product\_name": "Coca Cola 1.5L",  
        "sku": "CC-1500",  
        "category\_name": "Beverages",  
        "total\_sold": 450,  
        "total\_revenue": 6750000,  
        "rank": 1  
      }  
    \],  
    "underperformers": \[  
      {  
        "product\_id": "uuid",  
        "product\_name": "Premium Coffee Beans",  
        "sku": "PCB-001",  
        "category\_name": "Coffee",  
        "total\_sold": 5,  
        "total\_revenue": 175000,  
        "rank": 1  
      }  
    \]  
  }  
}  
\`\`\`

\---

\#\#\# \*\*4.11 AI Insight Module\*\*

\#\#\#\# \*\*GET /ai-insights/check-limit\*\*  
Check if AI analysis is available today.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "AI availability checked",  
  "data": {  
    "merchant\_id": "uuid",  
    "last\_analyzed\_at": "2026-08-10T08:00:00.000Z",  
    "can\_analyze": true,  
    "message": "AI analysis is available today"  
  }  
}  
\`\`\`

\*\*Response (Limit Reached):\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "AI availability checked",  
  "data": {  
    "merchant\_id": "uuid",  
    "last\_analyzed\_at": "2026-08-11T08:00:00.000Z",  
    "can\_analyze": false,  
    "message": "Daily AI analysis limit reached. Please try again tomorrow"  
  }  
}  
\`\`\`

\---

\#\#\#\# \*\*POST /ai-insights/analyze\*\*  
Trigger AI analysis (manual by Owner only).

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response (Accepted):\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 202,  
  "message": "AI analysis started",  
  "data": {  
    "job\_id": "bull-job-12345",  
    "status": "PROCESSING",  
    "message": "AI analysis is being processed. Results will be available shortly."  
  }  
}  
\`\`\`

\*\*Response (Limit Reached):\*\*  
\`\`\`json  
{  
  "success": false,  
  "statusCode": 400,  
  "path": "/api/v1/ai-insights/analyze",  
  "message": "Daily AI analysis limit reached. Please try again tomorrow",  
  "errors": \[\],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\*\*Response (Not Authorized):\*\*  
\`\`\`json  
{  
  "success": false,  
  "statusCode": 403,  
  "path": "/api/v1/ai-insights/analyze",  
  "message": "Only Owner can trigger AI analysis",  
  "errors": \[\],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\#\#\#\# \*\*GET /ai-insights\*\*  
Get the current AI insight for merchant.

Hubungan Merchant → AI Insight bersifat **1:1** dan sistem **tidak menyimpan histori**. Endpoint ini mengembalikan hasil analisis terakhir (insight hari ini), bukan daftar.

\*\*Headers:\*\* \`Authorization: Bearer \<token\>\`

\*\*Response:\*\*  
\`\`\`json  
{  
  "success": true,  
  "statusCode": 200,  
  "message": "AI insight retrieved",  
  "data": {  
    "insight\_id": "uuid",  
    "merchant\_id": "uuid",  
    "title": "Low Stock Alert: Coca Cola 1.5L",  
    "content": "Stock for Coca Cola 1.5L at Outlet A will run out in 2 days based on current sales velocity. Consider restocking 50 units.",  
    "type": "STOCK\_WARNING",  
    "created\_at": "2026-08-11T08:00:00.000Z",  
    "updated\_at": "2026-08-11T08:00:00.000Z"  
  }  
}  
\`\`\`

\*\*Response (Not Found):\*\*  
\`\`\`json  
{  
  "success": false,  
  "statusCode": 404,  
  "path": "/api/v1/ai-insights",  
  "message": "AI insight not found",  
  "errors": \[\],  
  "timestamp": "2026-08-11T14:30:00.000Z"  
}  
\`\`\`

\---

\#\# 5\. \*\*HTTP Status Codes\*\*

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

\---

\#\# 6\. \*\*Role-Based Access Control (RBAC)\*\*

| Endpoint | Method | OWNER | ADMIN | CASHIER |  
|----------|--------|-------|-------|---------|  
| \`/auth/login\` | POST | ✅ | ✅ | ✅ |  
| \`/auth/me\` | GET | ✅ | ✅ | ✅ |  
| \`/merchants\` | GET/PUT | ✅ | ✅ | ❌ |  
| \`/outlets\` | GET/POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| \`/users\` | GET/POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| \`/categories\` | GET/POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| \`/products\` | GET | ✅ | ✅ | ✅ |  
| \`/products\` | POST/PUT/DELETE | ✅ | ✅ | ❌ |  
| \`/inventory\` | GET | ✅ | ✅ | ✅ |  
| \`/inventory\` | PUT | ✅ | ✅ | ❌ |  
| \`/transactions\` | GET | ✅ | ✅ | ✅ (own outlet only) |  
| \`/transactions\` | POST | ✅ | ✅ | ✅ |  
| \`/transactions/{id}/cancel\` | POST | ✅ | ✅ | ✅ (own transaction only) |  
| \`/dashboard/owner\` | GET | ✅ | ❌ | ❌ |  
| \`/analytics/\*\` | GET | ✅ | ✅ | ❌ |  
| \`/ai-insights/check-limit\` | GET | ✅ | ❌ | ❌ |  
| \`/ai-insights/analyze\` | POST | ✅ | ❌ | ❌ |  
| \`/ai-insights\` | GET | ✅ | ✅ | ❌ |

\---

\#\# 7\. \*\*Notes\*\*

1\. \*\*Dashboard Endpoint:\*\* Only 1 endpoint (\`/dashboard/owner\`) for Owner dashboard, returns all data in one response.  
2\. \*\*Read Replica:\*\* All \`GET\` endpoints should use Read Replica for better performance.  
3\. \*\*Write Operations:\*\* \`POST\`, \`PUT\`, \`DELETE\`, \`PATCH\` operations use Primary Database.  
4\. \*\*AI Analysis:\*\* Limited to 1x per day per merchant, triggered manually by Owner.  
5\. \*\*Transaction Consistency:\*\* Stock deduction uses database transaction to ensure consistency.  
6\. \*\*Authentication:\*\* All endpoints (except login) require valid JWT token.

\---

\*\*End of Document\*\* 📄

\---

Ini udah lengkap semua ya\! Formatnya dokumen laporan yang bisa langsung dibaca. Ada semua endpoint dari Auth sampai AI Insight, lengkap dengan contoh request/response dan RBAC-nya. 🚀  
