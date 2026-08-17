// membawa input pembuatan category dari web ke application.
export interface CreateCategoryCommand {
  name: string;
}

// membawa perubahan category tanpa bergantung pada dto http.
export interface UpdateCategoryCommand {
  name?: string;
  isActive?: boolean;
}

// membawa filter category dari web ke application.
// cashier tetap dipaksa melihat category aktif di service.
export interface CategoryQuery {
  isActive?: boolean;
}

// membawa data category dari application ke web.
export interface CategoryResult {
  id: string;
  merchantId: string;
  name: string;
  isActive: boolean;
}

// membawa input pembuatan product dari web ke application.
export interface CreateProductCommand {
  name: string;
  price: string;
  categoryId: string;
  lowStockThreshold: number;
  isActive?: boolean;
}

// membawa perubahan product tanpa bergantung pada dto http.
export interface UpdateProductCommand {
  name?: string;
  price?: string;
  categoryId?: string;
  lowStockThreshold?: number;
  isActive?: boolean;
}

// membawa filter product dari web ke application.
export interface ProductQuery {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

// membawa data product dari application ke web.
export interface ProductResult {
  id: string;
  merchantId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  price: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// membawa harga override dari web ke application.
export interface UpsertOutletPriceCommand {
  price: string;
}

// membawa data harga override dari application ke web.
export interface OutletPriceResult {
  productId: string;
  outletId: string;
  price: string;
  updatedAt: Date;
}
